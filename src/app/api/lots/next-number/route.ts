import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { LotService } from "@/services/lot.service";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  try {
    const nextLotNumber = await LotService.getNextLotNumber();
    return apiSuccess({ nextLotNumber });
  } catch (err: any) {
    console.error("Get next lot number error:", err);
    return apiError(err.message || "Failed to get next lot number", "SERVER_ERROR", 500);
  }
}
