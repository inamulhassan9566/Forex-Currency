import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { SalePreviewSchema } from "@/validators";
import { SaleService } from "@/services/sale.service";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  try {
    const body = await req.json();
    const parsed = SalePreviewSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);
    }

    const { currencyId, totalQuantity, sellPrice, allocationMethod, manualAllocations } =
      parsed.data;

    const preview = await SaleService.previewSale({
      currencyId,
      totalQuantity,
      sellPrice,
      allocationMethod,
      manualAllocations,
    });

    return apiSuccess(preview);
  } catch (err: any) {
    console.error("Sale preview error:", err);
    return apiError(err.message || "Failed to generate sale preview", "SERVER_ERROR", 400);
  }
}
