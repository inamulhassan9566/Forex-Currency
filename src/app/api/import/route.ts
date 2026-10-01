import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { canCreateTransaction } from "@/lib/rbac";
import FinanceDecimal from "@/lib/decimal";
import Decimal from "decimal.js";
import { recordAuditLog } from "@/lib/audit";

interface ImportRow {
  lotNumber: string;
  currencyCode: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  supplier?: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  if (!canCreateTransaction(user.role)) {
    return apiError("You do not have permission to import inventory", "FORBIDDEN", 403);
  }

  try {
    const body = await req.json();
    const { rows, execute = false } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return apiError("No rows provided for import", "VALIDATION_ERROR", 400);
    }

    const currencies = await prisma.currency.findMany({ where: { isActive: true } });
    const currencyMap = new Map(currencies.map((c) => [c.code.toUpperCase(), c]));

    const existingLots = await prisma.lot.findMany({
      select: { lotNumber: true },
    });
    const existingLotNumbers = new Set(existingLots.map((l) => l.lotNumber.toUpperCase()));

    const validatedRows: Array<{
      row: ImportRow;
      isValid: boolean;
      errors: string[];
      currencyId?: string;
    }> = [];

    const seenInBatch = new Set<string>();

    for (const r of rows as ImportRow[]) {
      const errors: string[] = [];
      const lotNo = r.lotNumber?.trim().toUpperCase();
      const currCode = r.currencyCode?.trim().toUpperCase();
      const qty = Number(r.quantity);
      const price = Number(r.purchasePrice);

      if (!lotNo) {
        errors.push("Lot number is required");
      } else if (existingLotNumbers.has(lotNo)) {
        errors.push(`Lot number ${lotNo} already exists in database`);
      } else if (seenInBatch.has(lotNo)) {
        errors.push(`Duplicate lot number ${lotNo} within current batch`);
      } else {
        seenInBatch.add(lotNo);
      }

      const matchedCurrency = currencyMap.get(currCode);
      if (!matchedCurrency) {
        errors.push(`Active currency '${currCode}' not found`);
      }

      if (isNaN(qty) || qty <= 0) {
        errors.push("Quantity must be a positive number");
      }

      if (isNaN(price) || price < 0) {
        errors.push("Purchase price must be a non-negative number");
      }

      const dateObj = new Date(r.purchaseDate);
      if (isNaN(dateObj.getTime())) {
        errors.push("Invalid purchase date format");
      }

      validatedRows.push({
        row: r,
        isValid: errors.length === 0,
        errors,
        currencyId: matchedCurrency?.id,
      });
    }

    // If only preview was requested, return validated preview
    if (!execute) {
      const validCount = validatedRows.filter((r) => r.isValid).length;
      return apiSuccess({
        totalRows: validatedRows.length,
        validCount,
        invalidCount: validatedRows.length - validCount,
        preview: validatedRows,
      });
    }

    // Execute import for all valid rows inside a transaction
    const validToImport = validatedRows.filter((r) => r.isValid);
    if (validToImport.length === 0) {
      return apiError("No valid rows to import", "VALIDATION_ERROR", 400);
    }

    const importedResults = await prisma.$transaction(async (tx) => {
      const createdLots = [];

      for (const item of validToImport) {
        const { row, currencyId } = item;
        const qtyDec = FinanceDecimal.parse(row.quantity);
        const priceDec = FinanceDecimal.parse(row.purchasePrice);
        const costDec = FinanceDecimal.totalAmount(priceDec, qtyDec);
        const dateObj = new Date(row.purchaseDate);

        // 1. Create Lot
        const lot = await tx.lot.create({
          data: {
            lotNumber: row.lotNumber.trim(),
            currencyId: currencyId!,
            originalQuantity: qtyDec,
            remainingQuantity: qtyDec,
            purchasePrice: priceDec,
            purchaseDate: dateObj,
            totalPurchaseCost: costDec,
            status: "AVAILABLE",
            createdById: user.id,
            notes: row.notes || "Imported opening stock",
          },
        });

        // 2. Create Purchase record
        const po = await tx.purchase.create({
          data: {
            purchaseNumber: `IMP-${lot.lotNumber}`,
            lotId: lot.id,
            currencyId: currencyId!,
            quantity: qtyDec,
            purchasePrice: priceDec,
            totalAmount: costDec,
            purchaseDate: dateObj,
            supplier: row.supplier || "Opening Stock Import",
            notes: row.notes || null,
            status: "CONFIRMED",
            createdById: user.id,
          },
        });

        // 3. Create Opening Balance Ledger Transaction
        await tx.inventoryTransaction.create({
          data: {
            lotId: lot.id,
            currencyId: currencyId!,
            transactionType: "OPENING_BALANCE",
            quantityIn: qtyDec,
            quantityOut: new Decimal(0),
            balanceAfter: qtyDec,
            referenceType: "IMPORT",
            referenceId: po.id,
            notes: `Batch opening stock import for ${lot.lotNumber}`,
            transactionDate: dateObj,
            createdById: user.id,
          },
        });

        createdLots.push(lot);
      }

      return createdLots;
    });

    // Record audit log
    await recordAuditLog({
      userId: user.id,
      action: "IMPORTED_STOCK_BATCH",
      entity: "Lot",
      details: {
        totalRows: validatedRows.length,
        importedCount: importedResults.length,
        rejectedCount: validatedRows.length - importedResults.length,
      },
    });

    return apiSuccess({
      importedCount: importedResults.length,
      rejectedCount: validatedRows.length - importedResults.length,
      message: `Successfully imported ${importedResults.length} lots.`,
    });
  } catch (err: any) {
    console.error("Stock import error:", err);
    return apiError(err.message || "Failed to import inventory rows", "SERVER_ERROR", 500);
  }
}
