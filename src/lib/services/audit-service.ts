import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function writeAuditLog(input: {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId || null,
        actorUserId: input.actorUserId || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        metadata: input.metadata
      }
    });
  } catch (error) {
    // Allows app usage before audit-log migration is applied.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return;
    }

    throw error;
  }
}
