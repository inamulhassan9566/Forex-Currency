import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { canManageSettings } from "@/lib/rbac";
import { SettingsSchema } from "@/validators";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  let settings = await prisma.systemSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: { id: "default" },
    });
  }

  return apiSuccess(settings);
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  if (!canManageSettings(user.role)) {
    return apiError("Only Super Admins can update system settings", "FORBIDDEN", 403);
  }

  try {
    const body = await req.json();
    const parsed = SettingsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);
    }

    const updated = await prisma.systemSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...parsed.data,
      },
      update: parsed.data,
    });

    await recordAuditLog({
      userId: user.id,
      action: "UPDATED_SYSTEM_SETTINGS",
      entity: "SystemSettings",
      entityId: "default",
      details: parsed.data,
    });

    return apiSuccess(updated);
  } catch (err: any) {
    console.error("Update settings error:", err);
    return apiError(err.message || "Failed to update settings", "SERVER_ERROR", 500);
  }
}
