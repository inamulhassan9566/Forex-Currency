import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { comparePassword, signToken, COOKIE_NAME } from "@/lib/auth";
import { LoginSchema } from "@/validators";
import { apiError } from "@/lib/api-response";
import { recordAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return apiError("Invalid email or password", "AUTH_FAILED", 401);
    }

    if (user.status !== "ACTIVE") {
      return apiError("Your account has been deactivated. Please contact an administrator.", "ACCOUNT_DISABLED", 403);
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return apiError("Invalid email or password", "AUTH_FAILED", 401);
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });

    // Set secure HTTP-only cookie
    const isLocalhost = req.headers.get("host")?.includes("localhost") || req.headers.get("host")?.includes("127.0.0.1");
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !isLocalhost,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Record audit log
    await recordAuditLog({
      userId: user.id,
      action: "USER_LOGIN",
      entity: "User",
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: req.headers.get("x-forwarded-for") || req.ip || null,
      userAgent: req.headers.get("user-agent") || null,
    });

    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return apiError("An unexpected error occurred during login", "SERVER_ERROR", 500);
  }
}
