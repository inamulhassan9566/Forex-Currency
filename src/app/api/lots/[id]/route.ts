import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { LotService } from "@/services/lot.service";
import { isReadOnly } from "@/lib/rbac";
import { LotUpdateSchema } from "@/validators";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  try {
    const lot = await LotService.getLotById(params.id);
    if (!lot) {
      return apiError("Lot not found", "NOT_FOUND", 404);
    }
    return apiSuccess(lot);
  } catch (err: any) {
    console.error("Get lot error:", err);
    return apiError(err.message || "Failed to get lot", "SERVER_ERROR", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  if (isReadOnly(user.role)) {
    return apiError("You do not have permission to edit lots", "FORBIDDEN", 403);
  }

  try {
    const body = await req.json();
    const parsed = LotUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);
    }

    const updated = await LotService.updateLot(params.id, parsed.data, user.id);
    return apiSuccess(updated);
  } catch (err: any) {
    console.error("Update lot error:", err);
    return apiError(err.message || "Failed to update lot", "SERVER_ERROR", 400);
  }
}

