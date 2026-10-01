import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { canManageCurrencies } from "@/lib/rbac";
import { CurrencySchema } from "@/validators";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const currencies = await prisma.currency.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { code: "asc" },
  });

  return apiSuccess(currencies);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  if (!canManageCurrencies(user.role)) {
    return apiError("You do not have permission to manage currencies", "FORBIDDEN", 403);
  }

  try {
    const body = await req.json();
    const parsed = CurrencySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);
    }

    const { code, name, symbol, decimalPrecision, minStockThreshold, isActive } = parsed.data;

    const existing = await prisma.currency.findUnique({ where: { code } });
    if (existing) {
      return apiError(`Currency with code ${code} already exists`, "DUPLICATE_CODE", 400);
    }

    const currency = await prisma.currency.create({
      data: {
        code,
        name,
        symbol,
        decimalPrecision,
        minStockThreshold,
        isActive,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: "CREATED_CURRENCY",
      entity: "Currency",
      entityId: currency.id,
      details: { code, name, symbol },
    });

    return apiSuccess(currency, 201);
  } catch (err: any) {
    console.error("Create currency error:", err);
    return apiError(err.message || "Failed to create currency", "SERVER_ERROR", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("Unauthenticated", "UNAUTHORIZED", 401);
  if (!canManageCurrencies(user.role)) {
    return apiError("You do not have permission to update currencies", "FORBIDDEN", 403);
  }

  try {
    const body = await req.json();
    const { id, name, symbol, decimalPrecision, minStockThreshold, isActive } = body;

    if (!id) return apiError("Currency ID is required", "VALIDATION_ERROR", 400);

    const updated = await prisma.currency.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(symbol !== undefined && { symbol }),
        ...(decimalPrecision !== undefined && { decimalPrecision }),
        ...(minStockThreshold !== undefined && { minStockThreshold }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: "UPDATED_CURRENCY",
      entity: "Currency",
      entityId: updated.id,
      details: { code: updated.code, name: updated.name, isActive: updated.isActive },
    });

    return apiSuccess(updated);
  } catch (err: any) {
    console.error("Update currency error:", err);
    return apiError(err.message || "Failed to update currency", "SERVER_ERROR", 500);
  }
}
