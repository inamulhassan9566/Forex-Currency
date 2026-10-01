import { prisma } from "@/lib/db";
import FinanceDecimal from "@/lib/decimal";
import Decimal from "decimal.js";

export class LotService {
  /**
   * List lots with status, stock value, and realized profit
   */
  static async listLots(params?: {
    currencyId?: string;
    status?: "AVAILABLE" | "PARTIALLY_SOLD" | "SOLD_OUT" | "CANCELLED";
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params?.currencyId) {
      where.currencyId = params.currencyId;
    }

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.search) {
      const q = params.search.trim();
      where.lotNumber = { contains: q, mode: "insensitive" };
    }

    const [total, rawLots] = await Promise.all([
      prisma.lot.count({ where }),
      prisma.lot.findMany({
        where,
        include: {
          currency: true,
          purchase: {
            select: { id: true, purchaseNumber: true, supplier: true, purchaseDate: true },
          },
          saleAllocations: {
            include: {
              sale: {
                select: { id: true, saleNumber: true, status: true, saleDate: true },
              },
            },
          },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { purchaseDate: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const items = rawLots.map((lot) => {
      const origQty = FinanceDecimal.parse(lot.originalQuantity);
      const remQty = FinanceDecimal.parse(lot.remainingQuantity);
      const purchasePrice = FinanceDecimal.parse(lot.purchasePrice);

      const soldQty = origQty.minus(remQty);
      const stockValue = FinanceDecimal.totalAmount(purchasePrice, remQty);

      // Realized profit from confirmed sales
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
        id: lot.id,
        lotNumber: lot.lotNumber,
        currencyId: lot.currencyId,
        currency: lot.currency,
        originalQuantity: FinanceDecimal.toNumber(origQty, 4),
        remainingQuantity: FinanceDecimal.toNumber(remQty, 4),
        soldQuantity: FinanceDecimal.toNumber(soldQty, 4),
        purchasePrice: FinanceDecimal.toNumber(purchasePrice, prec),
        purchaseDate: lot.purchaseDate,
        totalPurchaseCost: FinanceDecimal.toNumber(lot.totalPurchaseCost, prec),
        stockValue: FinanceDecimal.toNumber(stockValue, prec),
        realizedProfit: FinanceDecimal.toNumber(realizedProfit, prec),
        averageSellPrice: FinanceDecimal.toNumber(avgSellPrice, prec),
        status: lot.status,
        notes: lot.notes,
        purchase: lot.purchase,
        createdBy: lot.createdBy,
        createdAt: lot.createdAt,
      };
    });

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single lot details with complete timeline of movements
   */
  static async getLotById(id: string) {
    const lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        currency: true,
        purchase: {
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
          },
        },
        saleAllocations: {
          include: {
            sale: {
              include: {
                createdBy: { select: { id: true, name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        inventoryTransactions: {
          orderBy: { transactionDate: "asc" },
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
          },
        },
        stockAdjustments: {
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!lot) return null;

    const origQty = FinanceDecimal.parse(lot.originalQuantity);
    const remQty = FinanceDecimal.parse(lot.remainingQuantity);
    const purchasePrice = FinanceDecimal.parse(lot.purchasePrice);

    const soldQty = origQty.minus(remQty);
    const stockValue = FinanceDecimal.totalAmount(purchasePrice, remQty);

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

    const profitMarginPercent = totalSaleAmount.greaterThan(0)
      ? realizedProfit.dividedBy(totalSaleAmount).times(100)
      : new Decimal(0);

    const prec = lot.currency.decimalPrecision;

    return {
      ...lot,
      originalQuantityNum: FinanceDecimal.toNumber(origQty, 4),
      remainingQuantityNum: FinanceDecimal.toNumber(remQty, 4),
      soldQuantityNum: FinanceDecimal.toNumber(soldQty, 4),
      purchasePriceNum: FinanceDecimal.toNumber(purchasePrice, prec),
      stockValueNum: FinanceDecimal.toNumber(stockValue, prec),
      realizedProfitNum: FinanceDecimal.toNumber(realizedProfit, prec),
      averageSellPriceNum: FinanceDecimal.toNumber(avgSellPrice, prec),
      profitMarginPercent: FinanceDecimal.toNumber(profitMarginPercent, 2),
    };
  }
}
