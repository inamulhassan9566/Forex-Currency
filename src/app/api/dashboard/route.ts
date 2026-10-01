import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { DashboardService } from "@/services/dashboard.service";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  try {
    const data = await DashboardService.getDashboardMetrics(days);
    return apiSuccess(data);
  } catch (err: any) {
    console.error("Dashboard error:", err);
    return apiError(err.message || "Failed to load dashboard data", "SERVER_ERROR", 500);
  }
}
