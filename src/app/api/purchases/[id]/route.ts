import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { PurchaseService } from "@/services/purchase.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  try {
    const purchase = await PurchaseService.getPurchaseById(params.id);
    if (!purchase) {
      return apiError("Purchase not found", "NOT_FOUND", 404);
    }
    return apiSuccess(purchase);
  } catch (err: any) {
    console.error("Get purchase error:", err);
    return apiError(err.message || "Failed to get purchase", "SERVER_ERROR", 500);
  }
}
