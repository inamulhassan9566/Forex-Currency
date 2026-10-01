import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { ReconciliationService } from "@/services/reconciliation.service";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  try {
    const results = await ReconciliationService.runFullReconciliation();
    return apiSuccess(results);
  } catch (err: any) {
    console.error("Reconciliation error:", err);
    return apiError(err.message || "Failed to run reconciliation", "SERVER_ERROR", 500);
  }
}
