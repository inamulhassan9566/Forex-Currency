import { prisma } from "@/lib/db";
import FinanceDecimal from "@/lib/decimal";
import Decimal from "decimal.js";

export interface FifoAllocationResult {
  lotId: string;
  lotNumber: string;
  purchaseDate: Date;
  purchasePrice: number;
  availableBefore: number;
  allocatedQuantity: number;
  remainingAfter: number;
  sellPrice: number;
  profitPerUnit: number;
  totalProfit: number;
  totalPurchaseCost: number;
  totalSaleAmount: number;
}

export interface FifoPlan {
  currencyId: string;
  currencyCode: string;
  requestedQuantity: number;
  allocatedQuantity: number;
  sellPrice: number;
  isSufficient: boolean;
  shortfall: number;
  totalPurchaseCost: number;
  totalSaleAmount: number;
  totalProfit: number;
  averagePurchasePrice: number;
  allocations: FifoAllocationResult[];
}

export class FifoService {
  /**
   * Compute FIFO allocation plan for a given currency and quantity
   */
  static async computeFifoPlan(
    currencyId: string,
    requestedQuantity: number,
    sellPrice: number
  ): Promise<FifoPlan> {
    const currency = await prisma.currency.findUnique({ where: { id: currencyId } });
    if (!currency) {
      throw new Error("Currency not found");
    }

    const reqQtyDec = FinanceDecimal.parse(requestedQuantity);
    const sellPriceDec = FinanceDecimal.parse(sellPrice);

    if (reqQtyDec.lessThanOrEqualTo(0)) {
      throw new Error("Requested quantity must be greater than zero");
    }

    // Fetch active lots ordered by purchase date ascending, then creation date ascending (FIFO order)
    const activeLots = await prisma.lot.findMany({
      where: {
        currencyId,
        remainingQuantity: { gt: 0 },
        status: { in: ["AVAILABLE", "PARTIALLY_SOLD"] },
      },
      orderBy: [{ purchaseDate: "asc" }, { createdAt: "asc" }],
    });

    let remainingNeeded = reqQtyDec;
    const allocations: FifoAllocationResult[] = [];

    let totalAllocatedDec = new Decimal(0);
    let totalCostDec = new Decimal(0);
    let totalSaleDec = new Decimal(0);
    let totalProfitDec = new Decimal(0);

    for (const lot of activeLots) {
      if (remainingNeeded.lessThanOrEqualTo(0)) break;

      const lotAvailDec = FinanceDecimal.parse(lot.remainingQuantity);
      const lotPurchasePriceDec = FinanceDecimal.parse(lot.purchasePrice);

      // Allocate min(available, remainingNeeded)
      const allocQtyDec = Decimal.min(lotAvailDec, remainingNeeded);

      const profitPerUnitDec = FinanceDecimal.profitPerUnit(sellPriceDec, lotPurchasePriceDec);
      const lotProfitDec = FinanceDecimal.totalProfit(profitPerUnitDec, allocQtyDec);
      const lotCostDec = FinanceDecimal.totalAmount(lotPurchasePriceDec, allocQtyDec);
      const lotSaleDec = FinanceDecimal.totalAmount(sellPriceDec, allocQtyDec);
      const remainingAfterDec = lotAvailDec.minus(allocQtyDec);

      allocations.push({
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        purchaseDate: lot.purchaseDate,
        purchasePrice: FinanceDecimal.toNumber(lotPurchasePriceDec, currency.decimalPrecision),
        availableBefore: FinanceDecimal.toNumber(lotAvailDec, 4),
        allocatedQuantity: FinanceDecimal.toNumber(allocQtyDec, 4),
        remainingAfter: FinanceDecimal.toNumber(remainingAfterDec, 4),
        sellPrice: FinanceDecimal.toNumber(sellPriceDec, currency.decimalPrecision),
        profitPerUnit: FinanceDecimal.toNumber(profitPerUnitDec, currency.decimalPrecision),
        totalProfit: FinanceDecimal.toNumber(lotProfitDec, currency.decimalPrecision),
        totalPurchaseCost: FinanceDecimal.toNumber(lotCostDec, currency.decimalPrecision),
        totalSaleAmount: FinanceDecimal.toNumber(lotSaleDec, currency.decimalPrecision),
      });

      totalAllocatedDec = totalAllocatedDec.plus(allocQtyDec);
      totalCostDec = totalCostDec.plus(lotCostDec);
      totalSaleDec = totalSaleDec.plus(lotSaleDec);
      totalProfitDec = totalProfitDec.plus(lotProfitDec);
      remainingNeeded = remainingNeeded.minus(allocQtyDec);
    }

    const isSufficient = remainingNeeded.lessThanOrEqualTo(0);
    const shortfallDec = isSufficient ? new Decimal(0) : remainingNeeded;
    const avgPurchasePriceDec = totalAllocatedDec.greaterThan(0)
      ? totalCostDec.dividedBy(totalAllocatedDec)
      : new Decimal(0);

    return {
      currencyId: currency.id,
      currencyCode: currency.code,
      requestedQuantity: FinanceDecimal.toNumber(reqQtyDec, 4),
      allocatedQuantity: FinanceDecimal.toNumber(totalAllocatedDec, 4),
      sellPrice: FinanceDecimal.toNumber(sellPriceDec, currency.decimalPrecision),
      isSufficient,
      shortfall: FinanceDecimal.toNumber(shortfallDec, 4),
      totalPurchaseCost: FinanceDecimal.toNumber(totalCostDec, currency.decimalPrecision),
      totalSaleAmount: FinanceDecimal.toNumber(totalSaleDec, currency.decimalPrecision),
      totalProfit: FinanceDecimal.toNumber(totalProfitDec, currency.decimalPrecision),
      averagePurchasePrice: FinanceDecimal.toNumber(avgPurchasePriceDec, currency.decimalPrecision),
      allocations,
    };
  }
}
