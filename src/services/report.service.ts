import { prisma } from "@/lib/db";
import FinanceDecimal from "@/lib/decimal";
import Decimal from "decimal.js";

export class ReportService {
  /**
   * 1. Lot-Wise Profit Report
   */
  static async getLotWiseProfitReport(params?: {
    currencyId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = { status: { not: "CANCELLED" } };

    if (params?.currencyId) {
      where.currencyId = params.currencyId;
    }

    if (params?.startDate || params?.endDate) {
      where.purchaseDate = {};
      if (params.startDate) where.purchaseDate.gte = new Date(params.startDate);
      if (params.endDate) where.purchaseDate.lte = new Date(params.endDate);
    }

    const lots = await prisma.lot.findMany({
      where,
      include: {
        currency: true,
        saleAllocations: {
          include: {
            sale: {
              select: { id: true, saleNumber: true, status: true, saleDate: true },
            },
          },
        },
      },
      orderBy: { purchaseDate: "asc" },
    });

    return lots.map((lot) => {
      const origQty = FinanceDecimal.parse(lot.originalQuantity);
      const remQty = FinanceDecimal.parse(lot.remainingQuantity);
      const pp = FinanceDecimal.parse(lot.purchasePrice);
      const soldQty = origQty.minus(remQty);
      const stockVal = FinanceDecimal.totalAmount(pp, remQty);

      let realizedProfit = new Decimal(0);
      let totalSaleAmount = new Decimal(0);

      for (const alloc of lot.saleAllocations) {
        if (alloc.sale.status === "CONFIRMED") {
          realizedProfit = realizedProfit.plus(FinanceDecimal.parse(alloc.totalProfit));
          totalSaleAmount = totalSaleAmount.plus(FinanceDecimal.parse(alloc.totalSaleAmount));
        }
      }

      const avgSellPrice = soldQty.greaterThan(0)
        ? totalSaleAmount.dividedBy(soldQty)
        : new Decimal(0);

      const prec = lot.currency.decimalPrecision;

      return {
        lotNumber: lot.lotNumber,
        currencyCode: lot.currency.code,
        currencyName: lot.currency.name,
        purchaseDate: lot.purchaseDate,
        purchaseQuantity: FinanceDecimal.toNumber(origQty, 4),
        purchasePrice: FinanceDecimal.toNumber(pp, prec),
        soldQuantity: FinanceDecimal.toNumber(soldQty, 4),
        remainingQuantity: FinanceDecimal.toNumber(remQty, 4),
        averageSellPrice: FinanceDecimal.toNumber(avgSellPrice, prec),
        realizedProfit: FinanceDecimal.toNumber(realizedProfit, prec),
        stockValue: FinanceDecimal.toNumber(stockVal, prec),
        status: lot.status,
      };
    });
  }

  /**
   * 2. Currency-Wise Profit & Position Report
   */
  static async getCurrencyWiseReport() {
    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      include: {
        lots: {
          where: { status: { not: "CANCELLED" } },
          include: {
            saleAllocations: {
              include: {
                sale: { select: { status: true } },
              },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    return currencies.map((curr) => {
      let totalBought = new Decimal(0);
      let totalSold = new Decimal(0);
      let totalRemaining = new Decimal(0);
      let totalPurchaseSpend = new Decimal(0);
      let totalSalesRevenue = new Decimal(0);
      let totalRealizedProfit = new Decimal(0);
      let totalInventoryValue = new Decimal(0);

      for (const lot of curr.lots) {
        const orig = FinanceDecimal.parse(lot.originalQuantity);
        const rem = FinanceDecimal.parse(lot.remainingQuantity);
        const pp = FinanceDecimal.parse(lot.purchasePrice);
        const sold = orig.minus(rem);

        totalBought = totalBought.plus(orig);
        totalSold = totalSold.plus(sold);
        totalRemaining = totalRemaining.plus(rem);
        totalPurchaseSpend = totalPurchaseSpend.plus(FinanceDecimal.totalAmount(pp, orig));
        totalInventoryValue = totalInventoryValue.plus(FinanceDecimal.totalAmount(pp, rem));

        for (const alloc of lot.saleAllocations) {
          if (alloc.sale.status === "CONFIRMED") {
            totalRealizedProfit = totalRealizedProfit.plus(FinanceDecimal.parse(alloc.totalProfit));
            totalSalesRevenue = totalSalesRevenue.plus(
              FinanceDecimal.parse(alloc.totalSaleAmount)
            );
          }
        }
      }

      const prec = curr.decimalPrecision;

      return {
        currencyCode: curr.code,
        currencyName: curr.name,
        symbol: curr.symbol,
        totalBought: FinanceDecimal.toNumber(totalBought, 4),
        totalSold: FinanceDecimal.toNumber(totalSold, 4),
        totalRemaining: FinanceDecimal.toNumber(totalRemaining, 4),
        totalPurchaseSpend: FinanceDecimal.toNumber(totalPurchaseSpend, prec),
        totalSalesRevenue: FinanceDecimal.toNumber(totalSalesRevenue, prec),
        totalRealizedProfit: FinanceDecimal.toNumber(totalRealizedProfit, prec),
        totalInventoryValue: FinanceDecimal.toNumber(totalInventoryValue, prec),
        minStockThreshold: FinanceDecimal.toNumber(curr.minStockThreshold, 4),
        isLowStock: totalRemaining.lessThan(FinanceDecimal.parse(curr.minStockThreshold)),
      };
    });
  }

  /**
   * 3. Daily Stock Position & Opening Stock Register (Daybook)
   * Calculates:
   * - Daily Opening Stock (all transactions prior to start of target day)
   * - Today's Inward Purchases (+)
   * - Today's Outward Sales (-)
   * - Closing Vault Stock (= Opening + Inward - Outward)
   * - Realized Profit Today
   */
  static async getDailyStockReport(targetDateStr?: string) {
    const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });

    const results = [];

    for (const curr of currencies) {
      // 1. Transactions prior to startOfDay determine the Daily Opening Stock
      const priorTxs = await prisma.inventoryTransaction.findMany({
        where: {
          currencyId: curr.id,
          transactionDate: { lt: startOfDay },
        },
      });

      let openingStock = new Decimal(0);
      for (const tx of priorTxs) {
        openingStock = openingStock
          .plus(FinanceDecimal.parse(tx.quantityIn))
          .minus(FinanceDecimal.parse(tx.quantityOut));
      }

      // 2. Transactions during target date
      const todayTxs = await prisma.inventoryTransaction.findMany({
        where: {
          currencyId: curr.id,
          transactionDate: { gte: startOfDay, lte: endOfDay },
        },
      });

      let inwardToday = new Decimal(0);
      let outwardToday = new Decimal(0);

      for (const tx of todayTxs) {
        inwardToday = inwardToday.plus(FinanceDecimal.parse(tx.quantityIn));
        outwardToday = outwardToday.plus(FinanceDecimal.parse(tx.quantityOut));
      }

      const closingStock = openingStock.plus(inwardToday).minus(outwardToday);

      // 3. Profit realized today
      const todayProfits = await prisma.profitRecord.findMany({
        where: {
          currencyId: curr.id,
          transactionDate: { gte: startOfDay, lte: endOfDay },
        },
      });

      let realizedProfitToday = new Decimal(0);
      for (const pr of todayProfits) {
        realizedProfitToday = realizedProfitToday.plus(FinanceDecimal.parse(pr.realizedProfit));
      }

      const prec = curr.decimalPrecision;

      results.push({
        currencyId: curr.id,
        currencyCode: curr.code,
        currencyName: curr.name,
        symbol: curr.symbol,
        openingStock: FinanceDecimal.toNumber(openingStock, 4),
        inwardToday: FinanceDecimal.toNumber(inwardToday, 4),
        outwardToday: FinanceDecimal.toNumber(outwardToday, 4),
        closingStock: FinanceDecimal.toNumber(closingStock, 4),
        realizedProfitToday: FinanceDecimal.toNumber(realizedProfitToday, prec),
        date: startOfDay.toISOString().slice(0, 10),
      });
    }

    return results;
  }

  /**
   * Helper to convert array of objects into CSV format
   */
  static convertToCsv(data: Record<string, any>[]): string {
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        if (val === null || val === undefined) return '""';
        const str = typeof val === "object" && val instanceof Date ? val.toISOString() : String(val);
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  }
}
