import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { LotService } from "@/services/lot.service";

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
