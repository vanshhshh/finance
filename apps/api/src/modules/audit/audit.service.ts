import { prisma } from "../../lib/prisma.js";
import { toJsonValue } from "../common/json.js";

export async function createAuditLog(input: {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string | null;
  actorEmail?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorId: input.actorId ?? undefined,
      actorEmail: input.actorEmail ?? undefined,
      metadata: toJsonValue(input.metadata),
    },
  });
}
