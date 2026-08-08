import { db } from "@/lib/db";
import { logError } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

// ponytail: fire-and-forget insert, no queue/batching. Fine at this write volume;
// move to a buffered writer if audit inserts ever show up in latency profiling.
export async function logAudit(entry: {
  tenantId: string;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await db.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId ?? null,
        userEmail: entry.userEmail ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        meta: entry.meta,
      },
    });
  } catch (err) {
    logError("audit-log-write", err, { tenantId: entry.tenantId, action: entry.action, entityType: entry.entityType });
  }
}
