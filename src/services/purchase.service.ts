import { prisma } from "@/lib/db";
import FinanceDecimal from "@/lib/decimal";
import { recordAuditLog } from "@/lib/audit";
import Decimal from "decimal.js";

export interface CreatePurchaseInput {
  currencyId: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string | Date;
  supplier?: string;
  referenceNumber?: string;
  notes?: string;
  customLotNumber?: string;
}

export class PurchaseService {
  /**
   * Generates next PO Number (e.g. PO-1008)
   */
  static async getNextPurchaseNumber(): Promise<string> {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "default" } });
    const prefix = settings?.purchaseNumberPrefix || "PO-";

    const lastPurchase = await prisma.purchase.findFirst({
      orderBy: { createdAt: "desc" },
      select: { purchaseNumber: true },
    });

    if (!lastPurchase) return `${prefix}1001`;

    const match = lastPurchase.purchaseNumber.match(/(\d+)$/);
    if (!match) return `${prefix}1001`;

    const nextSeq = parseInt(match[1], 10) + 1;
    return `${prefix}${nextSeq.toString().padStart(match[1].length, "0")}`;
  }

  /**
   * Generates next unique Lot Number (e.g. LOT-1008)
   */
  static async getNextLotNumber(): Promise<string> {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "default" } });
    const prefix = settings?.lotNumberPrefix || "LOT-";

    const lastLot = await prisma.lot.findFirst({
      orderBy: { createdAt: "desc" },
      select: { lotNumber: true },
    });

    if (!lastLot) return `${prefix}1001`;

    const match = lastLot.lotNumber.match(/(\d+)$/);
    if (!match) return `${prefix}1001`;

    const nextSeq = parseInt(match[1], 10) + 1;
    return `${prefix}${nextSeq.toString().padStart(match[1].length, "0")}`;
  }

  /**
   * Create Purchase + Lot + Inventory Ledger + Audit Log in a single atomic transaction
   */
  static async createPurchase(input: CreatePurchaseInput, userId: string) {
    const {
      currencyId,
      quantity,
      purchasePrice,
      purchaseDate,
      supplier,
      referenceNumber,
      notes,
      customLotNumber,
    } = input;

    // Validate currency
    const currency = await prisma.currency.findUnique({ where: { id: currencyId } });
    if (!currency) {
      throw new Error("Specified currency does not exist");
    }
    if (!currency.isActive) {
      throw new Error(`Currency ${currency.code} is inactive and cannot be traded`);
    }

    if (quantity <= 0) {
      throw new Error("Purchase quantity must be greater than zero");
    }
    if (purchasePrice < 0) {
      throw new Error("Purchase price cannot be negative");
    }

    // Determine numbers
    const purchaseNumber = await this.getNextPurchaseNumber();
    const lotNumber = customLotNumber?.trim() || (await this.getNextLotNumber());

    // Check if lotNumber is already taken
    const existingLot = await prisma.lot.findUnique({ where: { lotNumber } });
    if (existingLot) {
      throw new Error(`Lot number ${lotNumber} is already in use. Please specify a unique lot number.`);
    }

    // Calculate total cost with Decimal.js
    const qtyDec = FinanceDecimal.parse(quantity);
    const priceDec = FinanceDecimal.parse(purchasePrice);
    const totalCostDec = FinanceDecimal.totalAmount(priceDec, qtyDec);

    const dateObj = new Date(purchaseDate);

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Lot
      const lot = await tx.lot.create({
        data: {
          lotNumber,
          currencyId,
          originalQuantity: qtyDec,
          remainingQuantity: qtyDec,
          purchasePrice: priceDec,
          purchaseDate: dateObj,
          totalPurchaseCost: totalCostDec,
          status: "AVAILABLE",
          createdById: userId,
          notes,
        },
      });

      // 2. Create Purchase
      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          lotId: lot.id,
          currencyId,
          quantity: qtyDec,
          purchasePrice: priceDec,
          totalAmount: totalCostDec,
          purchaseDate: dateObj,
          supplier: supplier?.trim() || null,
          referenceNumber: referenceNumber?.trim() || null,
          notes: notes?.trim() || null,
          status: "CONFIRMED",
          createdById: userId,
        },
      });

      // 3. Create Inventory Transaction (Ledger)
      await tx.inventoryTransaction.create({
        data: {
          lotId: lot.id,
          currencyId,
          transactionType: "PURCHASE",
          quantityIn: qtyDec,
          quantityOut: new Decimal(0),
          balanceAfter: qtyDec,
          referenceType: "PURCHASE",
          referenceId: purchase.id,
          notes: `Stock purchase for ${lotNumber} via ${purchaseNumber}`,
          transactionDate: dateObj,
          createdById: userId,
        },
      });

      return { purchase, lot };
    });

    // Record audit log asynchronously
    await recordAuditLog({
      userId,
      action: "CREATED_PURCHASE",
      entity: "Purchase",
      entityId: result.purchase.id,
      details: {
        purchaseNumber: result.purchase.purchaseNumber,
        lotNumber: result.lot.lotNumber,
        currencyCode: currency.code,
        quantity,
        purchasePrice,
        totalCost: totalCostDec.toString(),
      },
    });

    return result;
  }

  /**
   * List purchases with filters & pagination
   */
  static async listPurchases(params?: {
    currencyId?: string;
    startDate?: string;
    endDate?: string;
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

    if (params?.startDate || params?.endDate) {
      where.purchaseDate = {};
      if (params.startDate) where.purchaseDate.gte = new Date(params.startDate);
      if (params.endDate) where.purchaseDate.lte = new Date(params.endDate);
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { purchaseNumber: { contains: q, mode: "insensitive" } },
        { supplier: { contains: q, mode: "insensitive" } },
        { referenceNumber: { contains: q, mode: "insensitive" } },
        { lot: { lotNumber: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        include: {
          currency: true,
          lot: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { purchaseDate: "desc" },
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

  /**
   * Get single purchase by ID with lot & full inventory history
   */
  static async getPurchaseById(id: string) {
    return prisma.purchase.findUnique({
      where: { id },
      include: {
        currency: true,
        lot: {
          include: {
            inventoryTransactions: {
              orderBy: { transactionDate: "asc" },
            },
            saleAllocations: {
              include: {
                sale: true,
              },
            },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
