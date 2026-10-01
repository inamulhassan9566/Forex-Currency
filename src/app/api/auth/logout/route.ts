import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, COOKIE_NAME } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (user) {
    await recordAuditLog({
      userId: user.id,
      action: "USER_LOGOUT",
      entity: "User",
      entityId: user.id,
      details: { email: user.email },
      ipAddress: req.headers.get("x-forwarded-for") || req.ip || null,
      userAgent: req.headers.get("user-agent") || null,
    });
  }

  const response = NextResponse.json({
    success: true,
    data: { message: "Logged out successfully" },
  });

  response.cookies.delete(COOKIE_NAME);
  return response;
}
