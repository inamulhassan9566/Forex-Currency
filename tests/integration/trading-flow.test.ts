import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { PurchaseService } from "@/services/purchase.service";
import { SaleService } from "@/services/sale.service";
import { ReconciliationService } from "@/services/reconciliation.service";
import { hasPermission } from "@/lib/rbac";

describe("Forex Trading Full Integration Flow", () => {
  let testUserId: string;
  let testCurrencyId: string;

  beforeAll(async () => {
    // Get existing seeded super admin and USD currency
    const user = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
    if (!user) throw new Error("Seed user not found");
    testUserId = user.id;

    const curr = await prisma.currency.findUnique({ where: { code: "USD" } });
    if (!curr) throw new Error("USD currency not found");
    testCurrencyId = curr.id;
  });

  it("Full Life-cycle: Purchase -> Multi-Lot Sale -> Profit Verification -> Sale Reversal", async () => {
    // 1. Create Purchase 1: 100 units @ 90.00
    const p1 = await PurchaseService.createPurchase(
      {
        currencyId: testCurrencyId,
        quantity: 100,
        purchasePrice: 90.0,
        purchaseDate: new Date(),
        supplier: "Integration Test Supplier 1",
        notes: "Test Lot A",
      },
      testUserId
    );

    expect(p1.lot.remainingQuantity.toString()).toBe("100");
    expect(p1.lot.status).toBe("AVAILABLE");

    // 2. Create Purchase 2: 100 units @ 95.00
    const p2 = await PurchaseService.createPurchase(
      {
        currencyId: testCurrencyId,
        quantity: 100,
        purchasePrice: 95.0,
        purchaseDate: new Date(),
        supplier: "Integration Test Supplier 2",
        notes: "Test Lot B",
      },
      testUserId
    );

    // 3. Create Multi-Lot Sale (CASE 3 from specification):
    // Sell 150 units total @ 100.00:
    // 100 units from Lot A (Purchase 90 -> Profit: 10 * 100 = 1000)
    // 50 units from Lot B (Purchase 95 -> Profit: 5 * 50 = 250)
    // Total profit: 1250
    const sale = await SaleService.createSale(
      {
        currencyId: testCurrencyId,
        totalQuantity: 150,
        saleDate: new Date(),
        customerName: "Integration Test Client",
        allocationMethod: "MANUAL",
        allocations: [
          { lotId: p1.lot.id, quantity: 100, sellPrice: 100.0 },
          { lotId: p2.lot.id, quantity: 50, sellPrice: 100.0 },
        ],
      },
      testUserId
    );

    expect(sale.totalQuantity.toString()).toBe("150");
    expect(sale.totalRealizedProfit.toString()).toBe("1250");
    expect(sale.status).toBe("CONFIRMED");

    // Verify Lot A is now SOLD_OUT with remaining = 0
    const lotA = await prisma.lot.findUnique({ where: { id: p1.lot.id } });
    expect(lotA?.remainingQuantity.toString()).toBe("0");
    expect(lotA?.status).toBe("SOLD_OUT");

    // Verify Lot B is PARTIALLY_SOLD with remaining = 50
    const lotB = await prisma.lot.findUnique({ where: { id: p2.lot.id } });
    expect(lotB?.remainingQuantity.toString()).toBe("50");
    expect(lotB?.status).toBe("PARTIALLY_SOLD");

    // 4. Reverse Sale (CASE 4 from specification)
    const reversed = await SaleService.reverseSale(
      sale.id,
      "Customer cancellation during integration testing",
      testUserId
    );

    expect(reversed.status).toBe("REVERSED");
    expect(reversed.reversalReason).toBe("Customer cancellation during integration testing");

    // Verify Lot A stock is fully restored to 100 and status is AVAILABLE
    const lotARestored = await prisma.lot.findUnique({ where: { id: p1.lot.id } });
    expect(lotARestored?.remainingQuantity.toString()).toBe("100");
    expect(lotARestored?.status).toBe("AVAILABLE");

    // Verify Lot B stock is fully restored to 100 and status is AVAILABLE
    const lotBRestored = await prisma.lot.findUnique({ where: { id: p2.lot.id } });
    expect(lotBRestored?.remainingQuantity.toString()).toBe("100");
    expect(lotBRestored?.status).toBe("AVAILABLE");

    // Verify inventory transactions recorded SALE_REVERSAL for both legs
    const reversalTxs = await prisma.inventoryTransaction.findMany({
      where: { referenceId: sale.id, transactionType: "SALE_REVERSAL" },
    });
    expect(reversalTxs).toHaveLength(2);
    const totalReversed = reversalTxs.reduce((sum, tx) => sum + Number(tx.quantityIn), 0);
    expect(totalReversed).toBe(150);
  });

  it("RBAC Permissions Verification", () => {
    // SUPER_ADMIN has users:manage and currencies:manage
    expect(hasPermission("SUPER_ADMIN", "users:manage")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "sales:reverse")).toBe(true);

    // OPERATOR cannot manage users or settings, but can create sales & purchases
    expect(hasPermission("OPERATOR", "users:manage")).toBe(false);
    expect(hasPermission("OPERATOR", "settings:manage")).toBe(false);
    expect(hasPermission("OPERATOR", "sales:create")).toBe(true);
    expect(hasPermission("OPERATOR", "purchases:create")).toBe(true);

    // VIEWER has only read-only view permissions
    expect(hasPermission("VIEWER", "sales:create")).toBe(false);
    expect(hasPermission("VIEWER", "purchases:create")).toBe(false);
    expect(hasPermission("VIEWER", "sales:view")).toBe(true);
    expect(hasPermission("VIEWER", "inventory:view")).toBe(true);
  });
});
