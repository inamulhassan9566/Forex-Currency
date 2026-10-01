import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { SaleService } from "@/services/sale.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  try {
    const sale = await SaleService.getSaleById(params.id);
    if (!sale) {
      return apiError("Sale not found", "NOT_FOUND", 404);
    }
    return apiSuccess(sale);
  } catch (err: any) {
    console.error("Get sale error:", err);
    return apiError(err.message || "Failed to get sale", "SERVER_ERROR", 500);
  }
}
