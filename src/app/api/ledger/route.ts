import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { LedgerService } from "@/services/ledger.service";
import { InventoryTransactionType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  const { searchParams } = new URL(req.url);
  const lotId = searchParams.get("lotId") || undefined;
  const currencyId = searchParams.get("currencyId") || undefined;
  const transactionType = (searchParams.get("transactionType") as InventoryTransactionType) || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const data = await LedgerService.listTransactions({
      lotId,
      currencyId,
      transactionType,
      startDate,
      endDate,
      page,
      limit,
    });
    return apiSuccess(data);
  } catch (err: any) {
    console.error("List ledger error:", err);
    return apiError(err.message || "Failed to list ledger transactions", "SERVER_ERROR", 500);
  }
}
