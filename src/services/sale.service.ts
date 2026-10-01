import { prisma } from "@/lib/db";
import FinanceDecimal from "@/lib/decimal";
import { recordAuditLog } from "@/lib/audit";
import Decimal from "decimal.js";
import { FifoService } from "./fifo.service";

export interface SaleAllocationInput {
  lotId: string;
  quantity: number;
  sellPrice: number;
}

export interface CreateSaleInput {
  currencyId: string;
  totalQuantity: number;
  saleDate: string | Date;
  customerName?: string;
  referenceNumber?: string;
  notes?: string;
  allocationMethod: "MANUAL" | "FIFO";
  allocations: SaleAllocationInput[];
}

export class SaleService {
  /**
   * Generates next Invoice / Sale Number (e.g. INV-1006)
   */
  static async getNextSaleNumber(): Promise<string> {
    const settings = await prisma.systemSettings.findUnique({ where: { id: "default" } });
    const prefix = settings?.saleNumberPrefix || "INV-";

    const lastSale = await prisma.sale.findFirst({
      orderBy: { createdAt: "desc" },
      select: { saleNumber: true },
    });

    if (!lastSale) return `${prefix}1001`;

    const match = lastSale.saleNumber.match(/(\d+)$/);
    if (!match) return `${prefix}1001`;

    const nextSeq = parseInt(match[1], 10) + 1;
    return `${prefix}${nextSeq.toString().padStart(match[1].length, "0")}`;
  }

  /**
   * Preview a sale before confirming (for Confirmation Dialog)
   */
  static async previewSale(params: {
    currencyId: string;
    totalQuantity: number;
    sellPrice?: number;
    allocationMethod: "MANUAL" | "FIFO";
    manualAllocations?: Array<{ lotId: string; quantity: number; sellPrice: number }>;
  }) {
    const { currencyId, totalQuantity, sellPrice = 0, allocationMethod, manualAllocations } = params;

    const currency = await prisma.currency.findUnique({ where: { id: currencyId } });
    if (!currency) {
      throw new Error("Specified currency does not exist");
    }

    if (totalQuantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    if (allocationMethod === "FIFO") {
      return FifoService.computeFifoPlan(currencyId, totalQuantity, sellPrice);
    }

    // Manual allocation preview
    if (!manualAllocations || manualAllocations.length === 0) {
      throw new Error("Manual allocation requires specifying at least one lot");
    }

    let allocatedTotal = new Decimal(0);
    let totalPurchaseCost = new Decimal(0);
    let totalSaleAmount = new Decimal(0);
    let totalProfit = new Decimal(0);

    const allocationsPreview = [];

    for (const alloc of manualAllocations) {
      const lot = await prisma.lot.findUnique({
        where: { id: alloc.lotId },
        include: { currency: true },
      });

      if (!lot) {
        throw new Error(`Lot not found: ${alloc.lotId}`);
      }

      if (lot.currencyId !== currencyId) {
        throw new Error(`Lot ${lot.lotNumber} belongs to ${lot.currency.code}, not ${currency.code}`);
      }

      if (lot.status === "CANCELLED") {
        throw new Error(`Lot ${lot.lotNumber} is marked as CANCELLED / LOCKED and cannot be sold.`);
      }

      const lotRemaining = FinanceDecimal.parse(lot.remainingQuantity);
      const allocQty = FinanceDecimal.parse(alloc.quantity);
      const sp = FinanceDecimal.parse(alloc.sellPrice);
      const pp = FinanceDecimal.parse(lot.purchasePrice);

      if (allocQty.greaterThan(lotRemaining)) {
        throw new Error(
          `Insufficient stock in Lot ${lot.lotNumber}. Available: ${lotRemaining}, requested: ${allocQty}`
        );
      }

      const profitPerUnit = FinanceDecimal.profitPerUnit(sp, pp);
      const lotProfit = FinanceDecimal.totalProfit(profitPerUnit, allocQty);
      const lotCost = FinanceDecimal.totalAmount(pp, allocQty);
      const lotSale = FinanceDecimal.totalAmount(sp, allocQty);

      allocatedTotal = allocatedTotal.plus(allocQty);
      totalPurchaseCost = totalPurchaseCost.plus(lotCost);
      totalSaleAmount = totalSaleAmount.plus(lotSale);
      totalProfit = totalProfit.plus(lotProfit);

      allocationsPreview.push({
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        purchaseDate: lot.purchaseDate,
        purchasePrice: FinanceDecimal.toNumber(pp, currency.decimalPrecision),
        availableBefore: FinanceDecimal.toNumber(lotRemaining, 4),
        allocatedQuantity: FinanceDecimal.toNumber(allocQty, 4),
        remainingAfter: FinanceDecimal.toNumber(lotRemaining.minus(allocQty), 4),
        sellPrice: FinanceDecimal.toNumber(sp, currency.decimalPrecision),
        profitPerUnit: FinanceDecimal.toNumber(profitPerUnit, currency.decimalPrecision),
        totalProfit: FinanceDecimal.toNumber(lotProfit, currency.decimalPrecision),
        totalPurchaseCost: FinanceDecimal.toNumber(lotCost, currency.decimalPrecision),
        totalSaleAmount: FinanceDecimal.toNumber(lotSale, currency.decimalPrecision),
      });
    }

    const isSufficient = allocatedTotal.equals(totalQuantity);
    const shortfall = Decimal.max(0, new Decimal(totalQuantity).minus(allocatedTotal));
    const avgPurchasePrice = allocatedTotal.greaterThan(0)
      ? totalPurchaseCost.dividedBy(allocatedTotal)
      : new Decimal(0);

    return {
      currencyId: currency.id,
      currencyCode: currency.code,
      requestedQuantity: totalQuantity,
      allocatedQuantity: FinanceDecimal.toNumber(allocatedTotal, 4),
      sellPrice,
      isSufficient,
      shortfall: FinanceDecimal.toNumber(shortfall, 4),
      totalPurchaseCost: FinanceDecimal.toNumber(totalPurchaseCost, currency.decimalPrecision),
      totalSaleAmount: FinanceDecimal.toNumber(totalSaleAmount, currency.decimalPrecision),
      totalProfit: FinanceDecimal.toNumber(totalProfit, currency.decimalPrecision),
      averagePurchasePrice: FinanceDecimal.toNumber(avgPurchasePrice, currency.decimalPrecision),
      allocations: allocationsPreview,
    };
  }

  /**
   * Create Sale with multi-lot allocations, inventory deduction, ledger, and audit log
   */
  static async createSale(input: CreateSaleInput, userId: string) {
    const {
      currencyId,
      totalQuantity,
      saleDate,
      customerName,
      referenceNumber,
      notes,
      allocationMethod,
      allocations,
    } = input;

    const currency = await prisma.currency.findUnique({ where: { id: currencyId } });
    if (!currency) {
      throw new Error("Specified currency does not exist");
    }

    if (totalQuantity <= 0) {
      throw new Error("Sale quantity must be greater than zero");
    }

    if (!allocations || allocations.length === 0) {
      throw new Error("No lot allocations provided for this sale");
    }

    const saleNumber = await this.getNextSaleNumber();
    const dateObj = new Date(saleDate);

    // Atomic transaction for database consistency and safety
    const saleResult = await prisma.$transaction(async (tx) => {
      let calcTotalQty = new Decimal(0);
      let calcTotalSaleAmount = new Decimal(0);
      let calcTotalPurchaseCost = new Decimal(0);
      let calcTotalRealizedProfit = new Decimal(0);

      // 1. Validate all allocated lots and lock them
      const verifiedAllocations: Array<{
        lot: any;
        allocQty: Decimal;
        sellPrice: Decimal;
        purchasePrice: Decimal;
        profitPerUnit: Decimal;
        totalProfit: Decimal;
        totalCost: Decimal;
        totalAmount: Decimal;
        newRemaining: Decimal;
      }> = [];

      for (const item of allocations) {
        const lot = await tx.lot.findUnique({
          where: { id: item.lotId },
          include: { currency: true },
        });

        if (!lot) {
          throw new Error(`Lot not found: ${item.lotId}`);
        }

        if (lot.currencyId !== currencyId) {
          throw new Error(`Lot ${lot.lotNumber} does not match currency ${currency.code}`);
        }

        if (lot.status === "CANCELLED") {
          throw new Error(`Lot ${lot.lotNumber} is marked as CANCELLED / LOCKED and cannot be sold.`);
        }

        const lotRemaining = FinanceDecimal.parse(lot.remainingQuantity);
        const allocQty = FinanceDecimal.parse(item.quantity);

        if (allocQty.lessThanOrEqualTo(0)) {
          throw new Error(`Allocation quantity for lot ${lot.lotNumber} must be greater than zero`);
        }

        if (allocQty.greaterThan(lotRemaining)) {
          throw new Error(
            `Unable to complete sale: Lot ${lot.lotNumber} only has ${lotRemaining} remaining stock, but ${allocQty} was requested.`
          );
        }

        const sp = FinanceDecimal.parse(item.sellPrice);
        const pp = FinanceDecimal.parse(lot.purchasePrice);
        const profitPerUnit = FinanceDecimal.profitPerUnit(sp, pp);
        const totalProfit = FinanceDecimal.totalProfit(profitPerUnit, allocQty);
        const totalCost = FinanceDecimal.totalAmount(pp, allocQty);
        const totalAmount = FinanceDecimal.totalAmount(sp, allocQty);
        const newRemaining = lotRemaining.minus(allocQty);

        calcTotalQty = calcTotalQty.plus(allocQty);
        calcTotalSaleAmount = calcTotalSaleAmount.plus(totalAmount);
        calcTotalPurchaseCost = calcTotalPurchaseCost.plus(totalCost);
        calcTotalRealizedProfit = calcTotalRealizedProfit.plus(totalProfit);

        verifiedAllocations.push({
          lot,
          allocQty,
          sellPrice: sp,
          purchasePrice: pp,
          profitPerUnit,
          totalProfit,
          totalCost,
          totalAmount,
          newRemaining,
        });
      }

      const avgSellPrice = calcTotalQty.greaterThan(0)
        ? calcTotalSaleAmount.dividedBy(calcTotalQty)
        : new Decimal(0);

      // 2. Create Sale Header
      const sale = await tx.sale.create({
        data: {
          saleNumber,
          currencyId,
          totalQuantity: calcTotalQty,
          averageSellPrice: avgSellPrice,
          totalSaleAmount: calcTotalSaleAmount,
          totalPurchaseCost: calcTotalPurchaseCost,
          totalRealizedProfit: calcTotalRealizedProfit,
          saleDate: dateObj,
          customerName: customerName?.trim() || null,
          referenceNumber: referenceNumber?.trim() || null,
          notes: notes?.trim() || null,
          allocationMethod,
          status: "CONFIRMED",
          createdById: userId,
        },
      });

      // 3. Process each allocation
      for (const va of verifiedAllocations) {
        // Create allocation record
        const allocationRecord = await tx.saleLotAllocation.create({
          data: {
            saleId: sale.id,
            lotId: va.lot.id,
            quantity: va.allocQty,
            purchasePrice: va.purchasePrice,
            sellPrice: va.sellPrice,
            totalPurchaseCost: va.totalCost,
            totalSaleAmount: va.totalAmount,
            profitPerUnit: va.profitPerUnit,
            totalProfit: va.totalProfit,
          },
        });

        // Create immutable profit record
        await tx.profitRecord.create({
          data: {
            saleId: sale.id,
            allocationId: allocationRecord.id,
            lotId: va.lot.id,
            currencyId,
            quantity: va.allocQty,
            purchasePrice: va.purchasePrice,
            sellPrice: va.sellPrice,
            profitPerUnit: va.profitPerUnit,
            realizedProfit: va.totalProfit,
            transactionDate: dateObj,
          },
        });

        // Update lot remaining quantity & status
        const nextStatus = va.newRemaining.lessThanOrEqualTo(0) ? "SOLD_OUT" : "PARTIALLY_SOLD";
        await tx.lot.update({
          where: { id: va.lot.id },
          data: {
            remainingQuantity: va.newRemaining,
            status: nextStatus,
          },
        });

        // Record stock movement in Inventory Ledger
        await tx.inventoryTransaction.create({
          data: {
            lotId: va.lot.id,
            currencyId,
            transactionType: "SALE",
            quantityIn: new Decimal(0),
            quantityOut: va.allocQty,
            balanceAfter: va.newRemaining,
            referenceType: "SALE",
            referenceId: sale.id,
            notes: `Sold ${va.allocQty} units from ${va.lot.lotNumber} in sale ${saleNumber}`,
            transactionDate: dateObj,
            createdById: userId,
          },
        });
      }

      return sale;
    });

    // Record audit log
    await recordAuditLog({
      userId,
      action: "CREATED_SALE",
      entity: "Sale",
      entityId: saleResult.id,
      details: {
        saleNumber: saleResult.saleNumber,
        currencyCode: currency.code,
        totalQuantity: saleResult.totalQuantity.toString(),
        totalSaleAmount: saleResult.totalSaleAmount.toString(),
        totalRealizedProfit: saleResult.totalRealizedProfit.toString(),
        allocationMethod,
        allocationsCount: allocations.length,
      },
    });

    return saleResult;
  }

  /**
   * Reverse / Cancel a Sale with full ledger reversal, profit reversal, stock restoration, and audit
   */
  static async reverseSale(saleId: string, reason: string, userId: string) {
    if (!reason || reason.trim().length < 3) {
      throw new Error("A valid reason (minimum 3 characters) is required to reverse a sale");
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        allocations: {
          include: { lot: true },
        },
        currency: true,
      },
    });

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status === "REVERSED") {
      throw new Error(`Sale ${sale.saleNumber} has already been reversed on ${sale.reversedAt}`);
    }

    const reverseDate = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark Sale as REVERSED
      const updatedSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: "REVERSED",
          reversedAt: reverseDate,
          reversalReason: reason.trim(),
          reversedById: userId,
        },
      });

      // 2. Mark profit records as reversed
      await tx.profitRecord.updateMany({
        where: { saleId: sale.id },
        data: { isReversed: true },
      });

      // 3. For each allocation, restore stock and create reversal ledger entry
      for (const alloc of sale.allocations) {
        const lot = await tx.lot.findUnique({ where: { id: alloc.lotId } });
        if (!lot) continue;

        const currentRem = FinanceDecimal.parse(lot.remainingQuantity);
        const restoreQty = FinanceDecimal.parse(alloc.quantity);
        const restoredBalance = currentRem.plus(restoreQty);
        const origQty = FinanceDecimal.parse(lot.originalQuantity);

        const restoredStatus = restoredBalance.greaterThanOrEqualTo(origQty)
          ? "AVAILABLE"
          : "PARTIALLY_SOLD";

        // Update lot
        await tx.lot.update({
          where: { id: lot.id },
          data: {
            remainingQuantity: restoredBalance,
            status: restoredStatus,
          },
        });

        // Create reversal inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            lotId: lot.id,
            currencyId: sale.currencyId,
            transactionType: "SALE_REVERSAL",
            quantityIn: restoreQty,
            quantityOut: new Decimal(0),
            balanceAfter: restoredBalance,
            referenceType: "SALE_REVERSAL",
            referenceId: sale.id,
            notes: `Sale reversal for ${sale.saleNumber}. Reason: ${reason.trim()}`,
            transactionDate: reverseDate,
            createdById: userId,
          },
        });
      }

      return updatedSale;
    });

    // Record audit log
    await recordAuditLog({
      userId,
      action: "REVERSED_SALE",
      entity: "Sale",
      entityId: sale.id,
      details: {
        saleNumber: sale.saleNumber,
        currencyCode: sale.currency.code,
        restoredQuantity: sale.totalQuantity.toString(),
        reversedProfit: sale.totalRealizedProfit.toString(),
        reason: reason.trim(),
      },
    });

    return result;
  }

  /**
   * List sales with filters & pagination
   */
  static async listSales(params?: {
    currencyId?: string;
    status?: "CONFIRMED" | "REVERSED";
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

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.startDate || params?.endDate) {
      where.saleDate = {};
      if (params.startDate) where.saleDate.gte = new Date(params.startDate);
      if (params.endDate) where.saleDate.lte = new Date(params.endDate);
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { saleNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { referenceNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: {
          currency: true,
          allocations: {
            include: { lot: true },
          },
          createdBy: { select: { id: true, name: true, email: true } },
          reversedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { saleDate: "desc" },
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
   * Get single sale by ID with full breakdown
   */
  static async getSaleById(id: string) {
    return prisma.sale.findUnique({
      where: { id },
      include: {
        currency: true,
        allocations: {
          include: {
            lot: {
              include: { currency: true },
            },
          },
        },
        profitRecords: true,
        createdBy: { select: { id: true, name: true, email: true } },
        reversedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
