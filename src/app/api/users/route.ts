import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { canManageUsers } from "@/lib/rbac";
import { UserCreateSchema } from "@/validators";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  if (!canManageUsers(user.role)) {
    return apiError("Only Super Admins can manage users", "FORBIDDEN", 403);
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(users);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  if (!canManageUsers(user.role)) {
    return apiError("Only Super Admins can create users", "FORBIDDEN", 403);
  }

  try {
    const body = await req.json();
    const parsed = UserCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);
    }

    const { name, email, password, role, status } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return apiError("A user with this email address already exists", "DUPLICATE_EMAIL", 400);
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: "CREATED_USER",
      entity: "User",
      entityId: newUser.id,
      details: { email: newUser.email, role: newUser.role },
    });

    return apiSuccess(newUser, 201);
  } catch (err: any) {
    console.error("Create user error:", err);
    return apiError(err.message || "Failed to create user", "SERVER_ERROR", 500);
  }
}
