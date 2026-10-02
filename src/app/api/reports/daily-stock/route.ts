import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { ReportService } from "@/services/report.service";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || undefined;

  try {
    const data = await ReportService.getDailyStockReport(date);
    return apiSuccess(data);
  } catch (err: any) {
    console.error("Daily stock report error:", err);
    return apiError(err.message || "Failed to generate daily stock report", "SERVER_ERROR", 500);
  }
}
