import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { ReportService } from "@/services/report.service";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");

  try {
    const reportData = await ReportService.getCurrencyWiseReport();

    if (format === "csv") {
      const csv = ReportService.convertToCsv(reportData);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="currency_position_report_${Date.now()}.csv"`,
        },
      });
    }

    return apiSuccess(reportData);
  } catch (err: any) {
    console.error("Currency report error:", err);
    return apiError(err.message || "Failed to generate currency report", "SERVER_ERROR", 500);
  }
}
