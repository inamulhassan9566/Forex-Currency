import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { canReverseSale } from "@/lib/rbac";
import { SaleReverseSchema } from "@/validators";
import { SaleService } from "@/services/sale.service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  if (!canReverseSale(user.role)) {
    return apiError("Only administrators can reverse a confirmed sale", "FORBIDDEN", 403);
  }

  try {
    const body = await req.json();
    const parsed = SaleReverseSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);
    }

    const reversed = await SaleService.reverseSale(params.id, parsed.data.reason, user.id);
    return apiSuccess(reversed);
  } catch (err: any) {
    console.error("Reverse sale error:", err);
    return apiError(err.message || "Failed to reverse sale", "SERVER_ERROR", 400);
  }
}
