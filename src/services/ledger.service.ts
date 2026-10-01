import { prisma } from "@/lib/db";
import { InventoryTransactionType } from "@prisma/client";

export interface ListLedgerParams {
  lotId?: string;
  currencyId?: string;
  transactionType?: InventoryTransactionType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class LedgerService {
  /**
   * List immutable inventory transactions with comprehensive filters
   */
  static async listTransactions(params?: ListLedgerParams) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params?.lotId) {
      where.lotId = params.lotId;
    }

    if (params?.currencyId) {
      where.currencyId = params.currencyId;
    }

    if (params?.transactionType) {
      where.transactionType = params.transactionType;
    }

    if (params?.startDate || params?.endDate) {
      where.transactionDate = {};
      if (params.startDate) where.transactionDate.gte = new Date(params.startDate);
      if (params.endDate) where.transactionDate.lte = new Date(params.endDate);
    }

    const [total, items] = await Promise.all([
      prisma.inventoryTransaction.count({ where }),
      prisma.inventoryTransaction.findMany({
        where,
        include: {
          lot: {
            select: { id: true, lotNumber: true, purchasePrice: true },
          },
          currency: true,
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { transactionDate: "desc" },
        skip,
        take: limit,
      }),
    ]);

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
}
