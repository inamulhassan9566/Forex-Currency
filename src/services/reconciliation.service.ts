import { prisma } from "@/lib/db";
import FinanceDecimal from "@/lib/decimal";
import { recordAuditLog } from "@/lib/audit";
import Decimal from "decimal.js";

export interface CurrencyReconciliationResult {
  currencyId: string;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  totalPurchased: number;
  totalSold: number;
  totalAdjustments: number;
  expectedStock: number;
  actualStock: number;
  difference: number;
  status: "MATCHED" | "DISCREPANCY_DETECTED";
  minStockThreshold: number;
  isLowStock: boolean;
  activeLotsCount: number;
  totalLotsCount: number;
}

export class ReconciliationService {
  /**
   * Run reconciliation across all active currencies
   */
  static async runFullReconciliation(): Promise<CurrencyReconciliationResult[]> {
    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });

    const results: CurrencyReconciliationResult[] = [];

    for (const curr of currencies) {
      // 1. Total Purchased
      const purchaseSum = await prisma.purchase.aggregate({
        where: { currencyId: curr.id, status: "CONFIRMED" },
        _sum: { quantity: true },
      });
      const totalPurchasedDec = FinanceDecimal.parse(purchaseSum._sum.quantity);

      // 2. Total Sold (confirmed sales only)
      const saleSum = await prisma.sale.aggregate({
        where: { currencyId: curr.id, status: "CONFIRMED" },
        _sum: { totalQuantity: true },
      });
      const totalSoldDec = FinanceDecimal.parse(saleSum._sum.totalQuantity);

      // 3. Adjustments
      const adjustments = await prisma.stockAdjustment.findMany({
        where: { currencyId: curr.id },
      });

      let netAdjustmentsDec = new Decimal(0);
      for (const adj of adjustments) {
        const adjQty = FinanceDecimal.parse(adj.quantity);
        if (adj.adjustmentType === "INCREASE") {
          netAdjustmentsDec = netAdjustmentsDec.plus(adjQty);
        } else {
          netAdjustmentsDec = netAdjustmentsDec.minus(adjQty);
        }
      }

      // Expected Stock = Total Purchased - Total Sold + Net Adjustments
      const expectedStockDec = totalPurchasedDec.minus(totalSoldDec).plus(netAdjustmentsDec);

      // 4. Actual Stock = Sum of remaining quantities on active lots
      const lots = await prisma.lot.findMany({
        where: {
          currencyId: curr.id,
          status: { not: "CANCELLED" },
        },
      });

      let actualStockDec = new Decimal(0);
      let activeLotsCount = 0;
      for (const lot of lots) {
        const rem = FinanceDecimal.parse(lot.remainingQuantity);
        actualStockDec = actualStockDec.plus(rem);
        if (rem.greaterThan(0)) {
          activeLotsCount++;
        }
      }

      // Difference = Actual Stock - Expected Stock
      const diffDec = actualStockDec.minus(expectedStockDec);
      const isMatched = diffDec.abs().lessThan(0.0001);

      const minThresholdDec = FinanceDecimal.parse(curr.minStockThreshold);
      const isLowStock = actualStockDec.lessThan(minThresholdDec);

      results.push({
        currencyId: curr.id,
        currencyCode: curr.code,
        currencyName: curr.name,
        symbol: curr.symbol,
        totalPurchased: FinanceDecimal.toNumber(totalPurchasedDec, 4),
        totalSold: FinanceDecimal.toNumber(totalSoldDec, 4),
        totalAdjustments: FinanceDecimal.toNumber(netAdjustmentsDec, 4),
        expectedStock: FinanceDecimal.toNumber(expectedStockDec, 4),
        actualStock: FinanceDecimal.toNumber(actualStockDec, 4),
        difference: FinanceDecimal.toNumber(diffDec, 4),
        status: isMatched ? "MATCHED" : "DISCREPANCY_DETECTED",
        minStockThreshold: FinanceDecimal.toNumber(minThresholdDec, 4),
        isLowStock,
        activeLotsCount,
        totalLotsCount: lots.length,
      });
    }

    return results;
  }

  /**
   * Create an inventory adjustment to reconcile lot stock
   */
  static async createAdjustment(
    params: {
      lotId: string;
      adjustmentType: "INCREASE" | "DECREASE";
      quantity: number;
      reason: string;
    },
    userId: string
  ) {
    const { lotId, adjustmentType, quantity, reason } = params;

    if (quantity <= 0) {
      throw new Error("Adjustment quantity must be greater than zero");
    }

    if (!reason || reason.trim().length < 3) {
      throw new Error("A clear reason (min 3 characters) is required for stock adjustments");
    }

    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: { currency: true },
    });

    if (!lot) {
      throw new Error("Lot not found");
    }

    const currentRem = FinanceDecimal.parse(lot.remainingQuantity);
    const adjQty = FinanceDecimal.parse(quantity);

    let newRem: Decimal;
    if (adjustmentType === "INCREASE") {
      newRem = currentRem.plus(adjQty);
    } else {
      if (adjQty.greaterThan(currentRem)) {
        throw new Error(
          `Cannot decrease stock by ${adjQty}: current remaining stock is only ${currentRem}`
        );
      }
      newRem = currentRem.minus(adjQty);
    }

    const nextStatus = newRem.equals(0)
      ? "SOLD_OUT"
      : newRem.greaterThanOrEqualTo(FinanceDecimal.parse(lot.originalQuantity))
      ? "AVAILABLE"
      : "PARTIALLY_SOLD";

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Lot
      const updatedLot = await tx.lot.update({
        where: { id: lot.id },
        data: {
          remainingQuantity: newRem,
          status: nextStatus,
        },
      });

      // 2. Create StockAdjustment Record
      const adjustment = await tx.stockAdjustment.create({
        data: {
          lotId: lot.id,
          currencyId: lot.currencyId,
          adjustmentType,
          quantity: adjQty,
          previousRemainingQuantity: currentRem,
          newRemainingQuantity: newRem,
          reason: reason.trim(),
          createdById: userId,
        },
      });

      // 3. Create Ledger Entry
      await tx.inventoryTransaction.create({
        data: {
          lotId: lot.id,
          currencyId: lot.currencyId,
          transactionType: "ADJUSTMENT",
          quantityIn: adjustmentType === "INCREASE" ? adjQty : new Decimal(0),
          quantityOut: adjustmentType === "DECREASE" ? adjQty : new Decimal(0),
          balanceAfter: newRem,
          referenceType: "ADJUSTMENT",
          referenceId: adjustment.id,
          notes: `Stock adjustment: ${adjustmentType} by ${quantity}. Reason: ${reason.trim()}`,
          transactionDate: now,
          createdById: userId,
        },
      });

      return { updatedLot, adjustment };
    });

    // Record audit log
    await recordAuditLog({
      userId,
      action: "STOCK_ADJUSTMENT",
      entity: "StockAdjustment",
      entityId: result.adjustment.id,
      details: {
        lotNumber: lot.lotNumber,
        currencyCode: lot.currency.code,
        adjustmentType,
        quantity,
        previousStock: currentRem.toString(),
        newStock: newRem.toString(),
        reason: reason.trim(),
      },
    });

    return result;
  }
}
