import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { canCreateTransaction } from "@/lib/rbac";
import { SaleCreateSchema } from "@/validators";
import { SaleService } from "@/services/sale.service";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  const { searchParams } = new URL(req.url);
  const currencyId = searchParams.get("currencyId") || undefined;
  const status = (searchParams.get("status") as any) || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const data = await SaleService.listSales({
      currencyId,
      status,
      startDate,
      endDate,
      search,
      page,
      limit,
    });
    return apiSuccess(data);
  } catch (err: any) {
    console.error("List sales error:", err);
    return apiError(err.message || "Failed to list sales", "SERVER_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  if (!canCreateTransaction(user.role)) {
    return apiError("You do not have permission to record sales", "FORBIDDEN", 403);
  }

  try {
    const body = await req.json();
    const parsed = SaleCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);
    }

    const result = await SaleService.createSale(parsed.data, user.id);
    return apiSuccess(result, 201);
  } catch (err: any) {
    console.error("Create sale error:", err);
    return apiError(err.message || "Failed to record sale", "SERVER_ERROR", 400);
  }
}
