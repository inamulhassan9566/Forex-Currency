const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Forex Lot Management System database...");

  // 1. Clear existing data in reverse relation order
  await prisma.auditLog.deleteMany();
  await prisma.profitRecord.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.saleLotAllocation.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.currency.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSettings.deleteMany();

  // 2. System Settings
  await prisma.systemSettings.create({
    data: {
      id: "default",
      companyName: "Apex Forex Trading Corp",
      baseCurrency: "USD",
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
      defaultAllocationMethod: "FIFO",
      lotNumberPrefix: "LOT-",
      saleNumberPrefix: "INV-",
      purchaseNumberPrefix: "PO-",
      financialYear: "2026-2027",
    },
  });
  console.log("Created System Settings");

  // 3. Users with secure bcrypt hashes
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash("Admin@123456", salt);
  const managerPassword = await bcrypt.hash("Manager@123456", salt);
  const operatorPassword = await bcrypt.hash("Operator@123456", salt);
  const viewerPassword = await bcrypt.hash("Viewer@123456", salt);

  const superAdmin = await prisma.user.create({
    data: {
      name: "Alex Vance (Super Admin)",
      email: "admin@example.com",
      passwordHash: adminPassword,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Sarah Jenkins (Financial Manager)",
      email: "manager@example.com",
      passwordHash: managerPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const operator = await prisma.user.create({
    data: {
      name: "David Kim (Forex Operator)",
      email: "operator@example.com",
      passwordHash: operatorPassword,
      role: "OPERATOR",
      status: "ACTIVE",
    },
  });

  const viewer = await prisma.user.create({
    data: {
      name: "Elena Rostova (Compliance Viewer)",
      email: "viewer@example.com",
      passwordHash: viewerPassword,
      role: "VIEWER",
      status: "ACTIVE",
    },
  });
  console.log("Created Users (Super Admin, Admin, Operator, Viewer)");

  // 4. Currencies
  const currencyDefs = [
    { code: "USD", name: "US Dollar", symbol: "$", decimalPrecision: 2, minStockThreshold: 100 },
    { code: "EUR", name: "Euro", symbol: "€", decimalPrecision: 2, minStockThreshold: 100 },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ", decimalPrecision: 2, minStockThreshold: 200 },
    { code: "GBP", name: "British Pound", symbol: "£", decimalPrecision: 2, minStockThreshold: 100 },
    { code: "INR", name: "Indian Rupee", symbol: "₹", decimalPrecision: 2, minStockThreshold: 1000 },
    { code: "SAR", name: "Saudi Riyal", symbol: "﷼", decimalPrecision: 2, minStockThreshold: 200 },
    { code: "QAR", name: "Qatari Riyal", symbol: "ر.ق", decimalPrecision: 2, minStockThreshold: 200 },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$", decimalPrecision: 2, minStockThreshold: 100 },
    { code: "AUD", name: "Australian Dollar", symbol: "A$", decimalPrecision: 2, minStockThreshold: 100 },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimalPrecision: 2, minStockThreshold: 100 },
    { code: "JPY", name: "Japanese Yen", symbol: "¥", decimalPrecision: 0, minStockThreshold: 10000 },
  ];

  const currencyMap = {};
  for (const c of currencyDefs) {
    const created = await prisma.currency.create({ data: c });
    currencyMap[c.code] = created;
  }
  console.log("Created Currencies:", Object.keys(currencyMap).join(", "));

  // Helper function to create Purchase + Lot + Inventory Ledger + Audit
  async function recordPurchase({
    poNumber,
    lotNumber,
    currencyCode,
    quantity,
    price,
    date,
    supplier,
    notes,
  }) {
    const curr = currencyMap[currencyCode];
    const totalCost = Number((quantity * price).toFixed(4));

    const lot = await prisma.lot.create({
      data: {
        lotNumber,
        currencyId: curr.id,
        originalQuantity: quantity,
        remainingQuantity: quantity,
        purchasePrice: price,
        purchaseDate: new Date(date),
        totalPurchaseCost: totalCost,
        status: "AVAILABLE",
        createdById: operator.id,
        notes,
      },
    });

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber: poNumber,
        lotId: lot.id,
        currencyId: curr.id,
        quantity,
        purchasePrice: price,
        totalAmount: totalCost,
        purchaseDate: new Date(date),
        supplier,
        notes,
        status: "CONFIRMED",
        createdById: operator.id,
      },
    });

    // Ledger Entry for Purchase
    await prisma.inventoryTransaction.create({
      data: {
        lotId: lot.id,
        currencyId: curr.id,
        transactionType: "PURCHASE",
        quantityIn: quantity,
        quantityOut: 0,
        balanceAfter: quantity,
        referenceType: "PURCHASE",
        referenceId: purchase.id,
        notes: `Initial stock purchase for ${lotNumber}`,
        transactionDate: new Date(date),
        createdById: operator.id,
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: operator.id,
        action: "CREATED_PURCHASE",
        entity: "Purchase",
        entityId: purchase.id,
        details: JSON.stringify({
          purchaseNumber: poNumber,
          lotNumber,
          currency: currencyCode,
          quantity,
          purchasePrice: price,
          totalCost,
        }),
      },
    });

    return { lot, purchase };
  }

  // Helper function to record Sale with lot allocations, profit records, inventory ledger, audit
  async function recordSale({
    saleNumber,
    currencyCode,
    date,
    customer,
    allocations, // [{ lot, quantity, sellPrice }]
    notes,
    allocationMethod = "MANUAL",
  }) {
    const curr = currencyMap[currencyCode];
    let totalQty = 0;
    let totalSaleAmount = 0;
    let totalPurchaseCost = 0;
    let totalRealizedProfit = 0;

    for (const alloc of allocations) {
      const q = alloc.quantity;
      const sp = alloc.sellPrice;
      const pp = Number(alloc.lot.purchasePrice);
      const profitUnit = Number((sp - pp).toFixed(4));
      const profitTotal = Number((profitUnit * q).toFixed(4));
      const saleAmt = Number((sp * q).toFixed(4));
      const costAmt = Number((pp * q).toFixed(4));

      totalQty += q;
      totalSaleAmount += saleAmt;
      totalPurchaseCost += costAmt;
      totalRealizedProfit += profitTotal;
    }

    const avgSellPrice = Number((totalSaleAmount / totalQty).toFixed(4));

    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        currencyId: curr.id,
        totalQuantity: totalQty,
        averageSellPrice: avgSellPrice,
        totalSaleAmount: Number(totalSaleAmount.toFixed(4)),
        totalPurchaseCost: Number(totalPurchaseCost.toFixed(4)),
        totalRealizedProfit: Number(totalRealizedProfit.toFixed(4)),
        saleDate: new Date(date),
        customerName: customer,
        notes,
        allocationMethod,
        status: "CONFIRMED",
        createdById: operator.id,
      },
    });

    for (const alloc of allocations) {
      const targetLot = await prisma.lot.findUnique({ where: { id: alloc.lot.id } });
      const q = alloc.quantity;
      const sp = alloc.sellPrice;
      const pp = Number(targetLot.purchasePrice);
      const profitUnit = Number((sp - pp).toFixed(4));
      const profitTotal = Number((profitUnit * q).toFixed(4));
      const saleAmt = Number((sp * q).toFixed(4));
      const costAmt = Number((pp * q).toFixed(4));

      const allocationRecord = await prisma.saleLotAllocation.create({
        data: {
          saleId: sale.id,
          lotId: targetLot.id,
          quantity: q,
          purchasePrice: pp,
          sellPrice: sp,
          totalPurchaseCost: costAmt,
          totalSaleAmount: saleAmt,
          profitPerUnit: profitUnit,
          totalProfit: profitTotal,
        },
      });

      // Profit Record
      await prisma.profitRecord.create({
        data: {
          saleId: sale.id,
          allocationId: allocationRecord.id,
          lotId: targetLot.id,
          currencyId: curr.id,
          quantity: q,
          purchasePrice: pp,
          sellPrice: sp,
          profitPerUnit: profitUnit,
          realizedProfit: profitTotal,
          transactionDate: new Date(date),
        },
      });

      // Update remaining quantity on Lot
      const newRemaining = Number(targetLot.remainingQuantity) - q;
      const newStatus = newRemaining <= 0 ? "SOLD_OUT" : "PARTIALLY_SOLD";

      await prisma.lot.update({
        where: { id: targetLot.id },
        data: {
          remainingQuantity: newRemaining,
          status: newStatus,
        },
      });

      // Ledger Entry for Sale
      await prisma.inventoryTransaction.create({
        data: {
          lotId: targetLot.id,
          currencyId: curr.id,
          transactionType: "SALE",
          quantityIn: 0,
          quantityOut: q,
          balanceAfter: newRemaining,
          referenceType: "SALE",
          referenceId: sale.id,
          notes: `Sold ${q} units from ${targetLot.lotNumber} in sale ${saleNumber}`,
          transactionDate: new Date(date),
          createdById: operator.id,
        },
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: operator.id,
        action: "CREATED_SALE",
        entity: "Sale",
        entityId: sale.id,
        details: JSON.stringify({
          saleNumber,
          currency: currencyCode,
          totalQuantity: totalQty,
          totalSaleAmount,
          totalRealizedProfit,
          allocationsCount: allocations.length,
        }),
      },
    });

    return sale;
  }

  // 5. Create Purchases matching the Source Business Document
  console.log("Creating Source Business Purchases...");
  const p1 = await recordPurchase({
    poNumber: "PO-1001",
    lotNumber: "LOT-1001",
    currencyCode: "USD",
    quantity: 200,
    price: 93.5,
    date: "2026-09-28T09:00:00Z",
    supplier: "Global Forex Wholesale",
    notes: "Initial Batch - USD",
  });

  const p2 = await recordPurchase({
    poNumber: "PO-1002",
    lotNumber: "LOT-1002",
    currencyCode: "EUR",
    quantity: 300,
    price: 110.3,
    date: "2026-09-28T10:15:00Z",
    supplier: "Euro Clearing House",
    notes: "Initial Batch - EUR",
  });

  const p3 = await recordPurchase({
    poNumber: "PO-1003",
    lotNumber: "LOT-1003",
    currencyCode: "AED",
    quantity: 500,
    price: 25.5,
    date: "2026-09-28T11:30:00Z",
    supplier: "Emirates Currency Exchange",
    notes: "Initial Batch - AED",
  });

  const p4 = await recordPurchase({
    poNumber: "PO-1004",
    lotNumber: "LOT-1004",
    currencyCode: "USD",
    quantity: 500,
    price: 94.5,
    date: "2026-09-29T08:30:00Z",
    supplier: "Federal Liquidity Desk",
    notes: "Additional USD Purchase",
  });

  const p5 = await recordPurchase({
    poNumber: "PO-1005",
    lotNumber: "LOT-1005",
    currencyCode: "EUR",
    quantity: 450,
    price: 112.5, // Note: business document notes 1120.50 typo or 112.50. We preserve 112.50 as standard unit price and document reconciliation
    date: "2026-09-29T10:00:00Z",
    supplier: "Frankfurt Trade Partners",
    notes: "Additional EUR Purchase",
  });

  const p6 = await recordPurchase({
    poNumber: "PO-1006",
    lotNumber: "LOT-1006",
    currencyCode: "AED",
    quantity: 600,
    price: 26.5,
    date: "2026-09-29T11:45:00Z",
    supplier: "Dubai Exchange LLC",
    notes: "Additional AED Purchase",
  });

  // Additional GBP and INR purchases to populate diverse currency operations
  const p7 = await recordPurchase({
    poNumber: "PO-1007",
    lotNumber: "LOT-1007",
    currencyCode: "GBP",
    quantity: 400,
    price: 130.2,
    date: "2026-09-29T14:00:00Z",
    supplier: "London FX Clearing",
    notes: "GBP Liquidity Lot",
  });

  // 6. Record Sales matching Source Business Document
  console.log("Recording Source Business Sales...");

  // Sale 1: Lot 1001, USD, Sold 150 @ 96.50
  await recordSale({
    saleNumber: "INV-1001",
    currencyCode: "USD",
    date: "2026-09-29T13:00:00Z",
    customer: "Global Travel & Tours",
    notes: "Direct sale from Lot 1001",
    allocations: [{ lot: p1.lot, quantity: 150, sellPrice: 96.5 }],
  });

  // Sale 2: Lot 1002, EUR, Sold 200 @ 113.60
  await recordSale({
    saleNumber: "INV-1002",
    currencyCode: "EUR",
    date: "2026-09-29T14:30:00Z",
    customer: "Continental Logistics",
    notes: "Direct sale from Lot 1002",
    allocations: [{ lot: p2.lot, quantity: 200, sellPrice: 113.6 }],
  });

  // Sale 3: Lot 1003, AED, Sold 500 @ 28.00 (Completely liquidates Lot 1003)
  await recordSale({
    saleNumber: "INV-1003",
    currencyCode: "AED",
    date: "2026-09-29T15:45:00Z",
    customer: "Middle East Trading Co.",
    notes: "Complete liquidation of Lot 1003",
    allocations: [{ lot: p3.lot, quantity: 500, sellPrice: 28.0 }],
  });

  // Sale 4: Lot 1006, AED, Sold 200 @ 28.00
  await recordSale({
    saleNumber: "INV-1004",
    currencyCode: "AED",
    date: "2026-09-30T10:00:00Z",
    customer: "Gulf Horizon Investments",
    notes: "Direct sale from Lot 1006",
    allocations: [{ lot: p6.lot, quantity: 200, sellPrice: 28.0 }],
  });

  console.log("Database seeded successfully with exact client demonstration records!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
