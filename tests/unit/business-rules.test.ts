import { describe, it, expect } from "vitest";
import FinanceDecimal from "@/lib/decimal";
import Decimal from "decimal.js";

describe("Business Logic & Financial Precision Tests", () => {
  it("CASE 1: Purchase 100 USD @ 90, Sell 50 USD @ 95", () => {
    const purchasePrice = 90;
    const sellPrice = 95;
    const originalQty = 100;
    const soldQty = 50;

    const profitPerUnit = FinanceDecimal.profitPerUnit(sellPrice, purchasePrice);
    const totalProfit = FinanceDecimal.totalProfit(profitPerUnit, soldQty);
    const remainingQty = FinanceDecimal.deductStock(originalQty, soldQty);

    expect(profitPerUnit.toString()).toBe("5");
    expect(totalProfit.toString()).toBe("250");
    expect(remainingQty.toString()).toBe("50");
  });

  it("CASE 2: Insufficient stock check blocks transaction (100 available vs 101 requested)", () => {
    const available = 100;
    const requested = 101;

    const isBlocked = FinanceDecimal.isInsufficient(available, requested);
    expect(isBlocked).toBe(true);
  });

  it("CASE 3: Multi-lot FIFO allocation (Lot A: 100 @ 90, Lot B: 100 @ 95, Sale: 150 @ 100)", () => {
    const lots = [
      { id: "A", lotNumber: "LOT-A", remaining: 100, purchasePrice: 90 },
      { id: "B", lotNumber: "LOT-B", remaining: 100, purchasePrice: 95 },
    ];

    const requestedTotal = 150;
    const sellPrice = 100;

    let remainingNeeded = requestedTotal;
    const allocations: Array<{ lotId: string; qty: number; profit: number }> = [];

    for (const lot of lots) {
      if (remainingNeeded <= 0) break;
      const allocQty = Math.min(lot.remaining, remainingNeeded);
      const profitPerUnit = FinanceDecimal.profitPerUnit(sellPrice, lot.purchasePrice);
      const totalProfit = FinanceDecimal.totalProfit(profitPerUnit, allocQty);

      allocations.push({
        lotId: lot.id,
        qty: allocQty,
        profit: FinanceDecimal.toNumber(totalProfit, 2),
      });

      remainingNeeded -= allocQty;
    }

    expect(allocations).toHaveLength(2);
    expect(allocations[0].lotId).toBe("A");
    expect(allocations[0].qty).toBe(100);
    expect(allocations[0].profit).toBe(1000); // (100 - 90) * 100 = 1000

    expect(allocations[1].lotId).toBe("B");
    expect(allocations[1].qty).toBe(50);
    expect(allocations[1].profit).toBe(250); // (100 - 95) * 50 = 250

    const totalProfit = allocations.reduce((sum, a) => sum + a.profit, 0);
    expect(totalProfit).toBe(1250);
  });

  it("Source Business Example 1: Lot 1001 USD 150 sold @ 96.50 (Purchase 93.50)", () => {
    const purchasePrice = 93.5;
    const sellPrice = 96.5;
    const soldQty = 150;

    const profitPerUnit = FinanceDecimal.profitPerUnit(sellPrice, purchasePrice);
    const totalProfit = FinanceDecimal.totalProfit(profitPerUnit, soldQty);

    expect(profitPerUnit.toFixed(2)).toBe("3.00");
    expect(totalProfit.toFixed(2)).toBe("450.00");
  });

  it("Source Business Example 2: Lot 1002 EURO 200 sold @ 113.60 (Purchase 110.30)", () => {
    const purchasePrice = 110.3;
    const sellPrice = 113.6;
    const soldQty = 200;

    const profitPerUnit = FinanceDecimal.profitPerUnit(sellPrice, purchasePrice);
    const totalProfit = FinanceDecimal.totalProfit(profitPerUnit, soldQty);

    expect(profitPerUnit.toFixed(2)).toBe("3.30");
    expect(totalProfit.toFixed(2)).toBe("660.00");
  });

  it("Source Business Example 3: Lot 1003 AED 500 sold @ 28.00 (Purchase 25.50)", () => {
    const purchasePrice = 25.5;
    const sellPrice = 28.0;
    const soldQty = 500;

    const profitPerUnit = FinanceDecimal.profitPerUnit(sellPrice, purchasePrice);
    const totalProfit = FinanceDecimal.totalProfit(profitPerUnit, soldQty);

    expect(profitPerUnit.toFixed(2)).toBe("2.50");
    expect(totalProfit.toFixed(2)).toBe("1250.00");
  });

  it("Financial precision avoids binary floating point rounding errors", () => {
    // Standard JS float error: 0.1 + 0.2 !== 0.3 (is 0.30000000000000004)
    const d1 = FinanceDecimal.parse(0.1);
    const d2 = FinanceDecimal.parse(0.2);
    const sum = d1.plus(d2);

    expect(sum.equals(0.3)).toBe(true);
    expect(FinanceDecimal.toFixedString(sum, 2)).toBe("0.30");
  });
});
