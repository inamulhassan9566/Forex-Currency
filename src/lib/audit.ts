import { prisma } from "./db";

export interface CreateAuditLogParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog({
  userId,
  action,
  entity,
  entityId,
  details,
  ipAddress,
  userAgent,
}: CreateAuditLogParams) {
  try {
    const detailsString =
      details && typeof details === "object" ? JSON.stringify(details) : (details as string) || null;

    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        details: detailsString,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Never crash the primary transaction if non-critical audit log creation fails
    return null;
  }
}
