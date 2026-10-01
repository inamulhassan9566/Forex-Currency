import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { LotService } from "@/services/lot.service";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  const { searchParams } = new URL(req.url);
  const currencyId = searchParams.get("currencyId") || undefined;
  const status = (searchParams.get("status") as any) || undefined;
  const search = searchParams.get("search") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const data = await LotService.listLots({
      currencyId,
      status,
      search,
      page,
      limit,
    });
    return apiSuccess(data);
  } catch (err: any) {
    console.error("List lots error:", err);
    return apiError(err.message || "Failed to list lots", "SERVER_ERROR", 500);
  }
}
