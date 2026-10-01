import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { canManageUsers } from "@/lib/rbac";
import { recordAuditLog } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  if (!canManageUsers(user.role)) {
    return apiError("Only Super Admins can update users", "FORBIDDEN", 403);
  }

  try {
    const body = await req.json();
    const { name, role, status, password } = body;

    const data: any = {};
    if (name) data.name = name;
    if (role) data.role = role;
    if (status) data.status = status;
    if (password) {
      if (password.length < 6) {
        return apiError("Password must be at least 6 characters", "VALIDATION_ERROR", 400);
      }
      data.passwordHash = await hashPassword(password);
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: "UPDATED_USER",
      entity: "User",
      entityId: updated.id,
      details: { email: updated.email, role: updated.role, status: updated.status },
    });

    return apiSuccess(updated);
  } catch (err: any) {
    console.error("Update user error:", err);
    return apiError(err.message || "Failed to update user", "SERVER_ERROR", 500);
  }
}
