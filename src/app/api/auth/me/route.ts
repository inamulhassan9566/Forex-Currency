import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  }
  return apiSuccess(user);
}
