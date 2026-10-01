import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { canAdjustStock } from "@/lib/rbac";
import { StockAdjustmentSchema } from "@/validators";
import { ReconciliationService } from "@/services/reconciliation.service";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  if (!canAdjustStock(user.role)) {
    return apiError("Only administrators can perform stock adjustments", "FORBIDDEN", 403);
  }

  try {
    const body = await req.json();
    const parsed = StockAdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);
    }

    const result = await ReconciliationService.createAdjustment(parsed.data, user.id);
    return apiSuccess(result, 201);
  } catch (err: any) {
    console.error("Stock adjustment error:", err);
    return apiError(err.message || "Failed to create stock adjustment", "SERVER_ERROR", 400);
  }
}
