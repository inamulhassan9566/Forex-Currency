import { prisma } from "./db";
import { DDL_STATEMENTS } from "./schema-ddl";
import bcrypt from "bcryptjs";

let initializationPromise: Promise<boolean> | null = null;

export async function ensureDatabaseReady(): Promise<boolean> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // 1. Check if public.users table exists
      const tableCheck = await prisma.$queryRawUnsafe<any[]>(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1"
      );

      const tableExists = tableCheck && tableCheck.length > 0;

      if (!tableExists) {
        console.log("No tables detected in database. Executing initial DDL schema statements...");
        for (const statement of DDL_STATEMENTS) {
          try {
            await prisma.$executeRawUnsafe(statement);
          } catch (stmtErr: any) {
            // Ignore if enum/table already exists
            if (!stmtErr.message?.includes("already exists")) {
              console.warn("DDL notice:", stmtErr.message);
            }
          }
        }
        console.log("✓ DDL schema initialized successfully.");
      }

      // 2. Check if users are seeded
      const userCount = await prisma.user.count().catch(() => 0);
      if (userCount === 0) {
        console.log("Seeding default users and client demonstration data...");
        await seedDefaultData();
        console.log("✓ Database seeded successfully!");
      }

      return true;
    } catch (err: any) {
      console.error("Database auto-init error:", err);
      initializationPromise = null;
      return false;
    }
  })();

  return initializationPromise;
}

async function seedDefaultData() {
  // Settings
  await prisma.systemSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
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

  // Users
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash("Admin@123456", salt);
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

  const operator = await prisma.user.create({
    data: {
      name: "David Kim (Forex Operator)",
      email: "operator@example.com",
      passwordHash: operatorPassword,
      role: "OPERATOR",
      status: "ACTIVE",
    },
  });

  await prisma.user.create({
    data: {
      name: "Elena Rostova (Compliance Viewer)",
      email: "viewer@example.com",
      passwordHash: viewerPassword,
      role: "VIEWER",
      status: "ACTIVE",
    },
  });

  // Currencies
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

  const currencyMap: Record<string, any> = {};
  for (const c of currencyDefs) {
    const created = await prisma.currency.create({ data: c });
    currencyMap[c.code] = created;
  }

  // Purchases / Lots from client document
  const purchasesData = [
    { po: "PO-1001", lot: "LOT-1001", curr: "USD", qty: 200, price: 93.50, date: "2026-09-28", notes: "Leftover opening lot as of 28/09/2026" },
    { po: "PO-1002", lot: "LOT-1002", curr: "EUR", qty: 300, price: 110.30, date: "2026-09-28", notes: "Leftover opening lot as of 28/09/2026" },
    { po: "PO-1003", lot: "LOT-1003", curr: "AED", qty: 500, price: 25.50, date: "2026-09-28", notes: "Leftover opening lot as of 28/09/2026" },
    { po: "PO-1004", lot: "LOT-1004", curr: "USD", qty: 500, price: 94.50, date: "2026-09-29", notes: "Inbound market purchase on 29/09/2026" },
    { po: "PO-1005", lot: "LOT-1005", curr: "EUR", qty: 450, price: 112.50, date: "2026-09-29", notes: "Inbound market purchase on 29/09/2026" },
    { po: "PO-1006", lot: "LOT-1006", curr: "AED", qty: 600, price: 26.50, date: "2026-09-29", notes: "Inbound market purchase on 29/09/2026" },
    { po: "PO-1007", lot: "LOT-1007", curr: "GBP", qty: 400, price: 130.20, date: "2026-09-30", notes: "Vault reserve acquisition" },
  ];

  const lotsMap: Record<string, any> = {};

  for (const item of purchasesData) {
    const curr = currencyMap[item.curr];
    const totalCost = Number((item.qty * item.price).toFixed(4));
    const lot = await prisma.lot.create({
      data: {
        lotNumber: item.lot,
        currencyId: curr.id,
        originalQuantity: item.qty,
        remainingQuantity: item.qty,
        purchasePrice: item.price,
        purchaseDate: new Date(item.date),
        totalPurchaseCost: totalCost,
        status: "AVAILABLE",
        createdById: operator.id,
        notes: item.notes,
      },
    });

    lotsMap[item.lot] = lot;

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber: item.po,
        lotId: lot.id,
        currencyId: curr.id,
        quantity: item.qty,
        purchasePrice: item.price,
        totalAmount: totalCost,
        purchaseDate: new Date(item.date),
        supplier: "Institutional Forex Desk",
        notes: item.notes,
        status: "CONFIRMED",
        createdById: operator.id,
      },
    });

    await prisma.inventoryTransaction.create({
      data: {
        lotId: lot.id,
        currencyId: curr.id,
        transactionType: "PURCHASE",
        quantityIn: item.qty,
        quantityOut: 0,
        balanceAfter: item.qty,
        referenceType: "PURCHASE",
        referenceId: purchase.id,
        transactionDate: new Date(item.date),
        notes: `Inbound receipt: ${item.lot}`,
        createdById: operator.id,
      },
    });
  }

  // Exact Sales from client document
  const salesData = [
    {
      inv: "INV-1001",
      curr: "USD",
      lot: "LOT-1001",
      qty: 150,
      sellRate: 96.50,
      customer: "Global Travel Corp",
      ref: "DL-USD-901",
      date: "2026-09-30",
    },
    {
      inv: "INV-1002",
      curr: "EUR",
      lot: "LOT-1002",
      qty: 200,
      sellRate: 113.60,
      customer: "EuroAsia Importers",
      ref: "DL-EUR-902",
      date: "2026-09-30",
    },
    {
      inv: "INV-1003",
      curr: "AED",
      lot: "LOT-1003",
      qty: 500,
      sellRate: 28.00,
      customer: "Gulf Horizon Logistics",
      ref: "DL-AED-903",
      date: "2026-09-30",
    },
    {
      inv: "INV-1004",
      curr: "AED",
      lot: "LOT-1006",
      qty: 200,
      sellRate: 28.00,
      customer: "Desert Sands Tourism",
      ref: "DL-AED-904",
      date: "2026-09-30",
    },
  ];

  for (const s of salesData) {
    const lot = lotsMap[s.lot];
    const curr = currencyMap[s.curr];
    const buyPrice = Number(lot.purchasePrice);
    const profitPerUnit = Number((s.sellRate - buyPrice).toFixed(4));
    const totalProfit = Number((profitPerUnit * s.qty).toFixed(4));
    const totalCost = Number((buyPrice * s.qty).toFixed(4));
    const totalSale = Number((s.sellRate * s.qty).toFixed(4));
    const newRem = Number(lot.remainingQuantity) - s.qty;
    lot.remainingQuantity = newRem;

    const sale = await prisma.sale.create({
      data: {
        saleNumber: s.inv,
        currencyId: curr.id,
        totalQuantity: s.qty,
        averageSellPrice: s.sellRate,
        totalSaleAmount: totalSale,
        totalPurchaseCost: totalCost,
        totalRealizedProfit: totalProfit,
        saleDate: new Date(s.date),
        customerName: s.customer,
        referenceNumber: s.ref,
        notes: `Allocation from ${lot.lotNumber}`,
        allocationMethod: "FIFO",
        status: "CONFIRMED",
        createdById: operator.id,
      },
    });

    const alloc = await prisma.saleLotAllocation.create({
      data: {
        saleId: sale.id,
        lotId: lot.id,
        quantity: s.qty,
        purchasePrice: buyPrice,
        sellPrice: s.sellRate,
        totalPurchaseCost: totalCost,
        totalSaleAmount: totalSale,
        profitPerUnit,
        totalProfit,
      },
    });

    await prisma.profitRecord.create({
      data: {
        saleId: sale.id,
        allocationId: alloc.id,
        lotId: lot.id,
        currencyId: curr.id,
        quantity: s.qty,
        purchasePrice: buyPrice,
        sellPrice: s.sellRate,
        profitPerUnit,
        realizedProfit: totalProfit,
        transactionDate: new Date(s.date),
      },
    });

    const nextStatus = newRem <= 0 ? "SOLD_OUT" : "PARTIALLY_SOLD";
    await prisma.lot.update({
      where: { id: lot.id },
      data: {
        remainingQuantity: newRem,
        status: nextStatus,
      },
    });

    await prisma.inventoryTransaction.create({
      data: {
        lotId: lot.id,
        currencyId: curr.id,
        transactionType: "SALE",
        quantityIn: 0,
        quantityOut: s.qty,
        balanceAfter: newRem,
        referenceType: "SALE",
        referenceId: sale.id,
        transactionDate: new Date(s.date),
        notes: `Sale to ${s.customer} (${s.inv})`,
        createdById: operator.id,
      },
    });
  }
}
