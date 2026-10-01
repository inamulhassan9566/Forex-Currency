import { prisma } from "@/lib/db";
import FinanceDecimal from "@/lib/decimal";
import Decimal from "decimal.js";

export class DashboardService {
  /**
   * Get complete dashboard metrics, charts, and recent activity
   */
  static async getDashboardMetrics(dateRangeDays = 30) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - dateRangeDays);

    // 1. Lots metrics (Active lots, Unsold lots, Total stock qty, Total stock value)
    const lots = await prisma.lot.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { currency: true },
    });

    let totalStockQty = new Decimal(0);
    let totalStockValue = new Decimal(0);
    let activeLotsCount = 0;
    let unsoldLotsCount = 0;

    const stockByCurrencyMap: Record<
      string,
      { code: string; symbol: string; qty: Decimal; value: Decimal; minThreshold: Decimal }
    > = {};

    for (const lot of lots) {
      const rem = FinanceDecimal.parse(lot.remainingQuantity);
      const orig = FinanceDecimal.parse(lot.originalQuantity);
      const pp = FinanceDecimal.parse(lot.purchasePrice);
      const val = FinanceDecimal.totalAmount(pp, rem);

      totalStockQty = totalStockQty.plus(rem);
      totalStockValue = totalStockValue.plus(val);

      if (rem.greaterThan(0)) {
        activeLotsCount++;
      }
      if (rem.equals(orig)) {
        unsoldLotsCount++;
      }

      if (!stockByCurrencyMap[lot.currency.code]) {
        stockByCurrencyMap[lot.currency.code] = {
          code: lot.currency.code,
          symbol: lot.currency.symbol,
          qty: new Decimal(0),
          value: new Decimal(0),
          minThreshold: FinanceDecimal.parse(lot.currency.minStockThreshold),
        };
      }
      stockByCurrencyMap[lot.currency.code].qty = stockByCurrencyMap[lot.currency.code].qty.plus(rem);
      stockByCurrencyMap[lot.currency.code].value =
        stockByCurrencyMap[lot.currency.code].value.plus(val);
    }

    // Low stock currencies
    let lowStockCount = 0;
    const lowStockCurrencies: Array<{ code: string; stock: number; threshold: number }> = [];
    for (const item of Object.values(stockByCurrencyMap)) {
      if (item.qty.lessThan(item.minThreshold)) {
        lowStockCount++;
        lowStockCurrencies.push({
          code: item.code,
          stock: FinanceDecimal.toNumber(item.qty, 2),
          threshold: FinanceDecimal.toNumber(item.minThreshold, 2),
        });
      }
    }

    // 2. Sales metrics (All time, monthly, today)
    const allSales = await prisma.sale.findMany({
      where: { status: "CONFIRMED" },
      include: { currency: true },
    });

    let totalRealizedProfit = new Decimal(0);
    let monthlySalesAmount = new Decimal(0);
    let monthlyProfit = new Decimal(0);
    let todaySalesAmount = new Decimal(0);
    let todayProfit = new Decimal(0);
    let todaySalesCount = 0;

    const profitByCurrencyMap: Record<string, { code: string; profit: Decimal; sales: Decimal }> =
      {};

    for (const s of allSales) {
      const profit = FinanceDecimal.parse(s.totalRealizedProfit);
      const saleAmt = FinanceDecimal.parse(s.totalSaleAmount);

      totalRealizedProfit = totalRealizedProfit.plus(profit);

      if (s.saleDate >= monthStart) {
        monthlySalesAmount = monthlySalesAmount.plus(saleAmt);
        monthlyProfit = monthlyProfit.plus(profit);
      }

      if (s.saleDate >= todayStart) {
        todaySalesAmount = todaySalesAmount.plus(saleAmt);
        todayProfit = todayProfit.plus(profit);
        todaySalesCount++;
      }

      const cCode = s.currency.code;
      if (!profitByCurrencyMap[cCode]) {
        profitByCurrencyMap[cCode] = { code: cCode, profit: new Decimal(0), sales: new Decimal(0) };
      }
      profitByCurrencyMap[cCode].profit = profitByCurrencyMap[cCode].profit.plus(profit);
      profitByCurrencyMap[cCode].sales = profitByCurrencyMap[cCode].sales.plus(saleAmt);
    }

    // 3. Purchases metrics (Today)
    const todayPurchases = await prisma.purchase.findMany({
      where: {
        status: "CONFIRMED",
        purchaseDate: { gte: todayStart },
      },
    });

    let todayPurchasesAmount = new Decimal(0);
    for (const p of todayPurchases) {
      todayPurchasesAmount = todayPurchasesAmount.plus(FinanceDecimal.parse(p.totalAmount));
    }

    // 4. Daily Sales & Profit Trend for chart
    const dailyTrendMap: Record<string, { date: string; sales: number; profit: number }> = {};
    for (let i = dateRangeDays; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      dailyTrendMap[dateKey] = { date: dateKey, sales: 0, profit: 0 };
    }

    for (const s of allSales) {
      const dateKey = s.saleDate.toISOString().slice(0, 10);
      if (dailyTrendMap[dateKey]) {
        dailyTrendMap[dateKey].sales += FinanceDecimal.toNumber(s.totalSaleAmount, 2);
        dailyTrendMap[dateKey].profit += FinanceDecimal.toNumber(s.totalRealizedProfit, 2);
      }
    }

    // 5. Recent Activity (latest 8 transactions)
    const recentLedger = await prisma.inventoryTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        currency: true,
        lot: true,
        createdBy: { select: { name: true } },
      },
    });

    const recentActivity = recentLedger.map((tx) => ({
      id: tx.id,
      lotNumber: tx.lot.lotNumber,
      currencyCode: tx.currency.code,
      type: tx.transactionType,
      qtyIn: FinanceDecimal.toNumber(tx.quantityIn, 2),
      qtyOut: FinanceDecimal.toNumber(tx.quantityOut, 2),
      balanceAfter: FinanceDecimal.toNumber(tx.balanceAfter, 2),
      date: tx.transactionDate,
      createdBy: tx.createdBy.name,
      notes: tx.notes,
    }));

    return {
      kpi: {
        totalStockQuantity: FinanceDecimal.toNumber(totalStockQty, 2),
        totalStockValue: FinanceDecimal.toNumber(totalStockValue, 2),
        todayPurchasesCount: todayPurchases.length,
        todayPurchasesAmount: FinanceDecimal.toNumber(todayPurchasesAmount, 2),
        todaySalesCount,
        todaySalesAmount: FinanceDecimal.toNumber(todaySalesAmount, 2),
        todayRealizedProfit: FinanceDecimal.toNumber(todayProfit, 2),
        monthlySalesAmount: FinanceDecimal.toNumber(monthlySalesAmount, 2),
        monthlyRealizedProfit: FinanceDecimal.toNumber(monthlyProfit, 2),
        totalRealizedProfit: FinanceDecimal.toNumber(totalRealizedProfit, 2),
        activeLotsCount,
        unsoldLotsCount,
        lowStockCurrenciesCount: lowStockCount,
      },
      charts: {
        dailyTrend: Object.values(dailyTrendMap),
        profitByCurrency: Object.values(profitByCurrencyMap).map((c) => ({
          currency: c.code,
          profit: FinanceDecimal.toNumber(c.profit, 2),
          sales: FinanceDecimal.toNumber(c.sales, 2),
        })),
        inventoryByCurrency: Object.values(stockByCurrencyMap).map((c) => ({
          currency: c.code,
          quantity: FinanceDecimal.toNumber(c.qty, 2),
          value: FinanceDecimal.toNumber(c.value, 2),
        })),
      },
      lowStockAlerts: lowStockCurrencies,
      recentActivity,
    };
  }
}
