import { db } from "@/lib/db";
import { Prisma, QueueStage } from "@prisma/client";

type StageEntryWithAssignee = Prisma.QueueStageEntryGetPayload<{ include: { assignedTo: true } }>;

export const QUEUE_STAGES: QueueStage[] = [
  "REGISTRATION",
  "VITALS",
  "CONSULTATION",
  "LAB",
  "CONSULTATION_2",
  "PHARMACY",
];

const DEFAULT_TURNAROUND_MINUTES: Record<QueueStage, number> = {
  REGISTRATION: 10,
  VITALS: 10,
  CONSULTATION: 20,
  LAB: 30,
  CONSULTATION_2: 15,
  PHARMACY: 15,
};

export async function listStageConfigs(tenantId: string): Promise<Record<QueueStage, number>> {
  const configs = await db.queueStageConfig.findMany({ where: { tenantId } });
  const result = { ...DEFAULT_TURNAROUND_MINUTES };
  for (const config of configs) {
    result[config.stage] = config.turnaroundMinutes;
  }
  return result;
}

export async function upsertStageConfig(tenantId: string, stage: QueueStage, turnaroundMinutes: number) {
  return db.queueStageConfig.upsert({
    where: { tenantId_stage: { tenantId, stage } },
    create: { tenantId, stage, turnaroundMinutes },
    update: { turnaroundMinutes },
  });
}

export async function getStageEntriesForAppointments(appointmentIds: string[], tenantId: string) {
  if (appointmentIds.length === 0) return new Map<string, Map<QueueStage, StageEntryWithAssignee>>();

  const entries = await db.queueStageEntry.findMany({
    where: { tenantId, appointmentId: { in: appointmentIds } },
    include: { assignedTo: true },
  });

  const map = new Map<string, Map<QueueStage, StageEntryWithAssignee>>();
  for (const entry of entries) {
    if (!map.has(entry.appointmentId)) map.set(entry.appointmentId, new Map());
    map.get(entry.appointmentId)!.set(entry.stage, entry);
  }
  return map;
}

export async function startStage(params: {
  tenantId: string;
  appointmentId: string;
  stage: QueueStage;
  assignedToId?: string;
}) {
  return db.queueStageEntry.upsert({
    where: { appointmentId_stage: { appointmentId: params.appointmentId, stage: params.stage } },
    create: {
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      stage: params.stage,
      assignedToId: params.assignedToId,
    },
    update: {
      assignedToId: params.assignedToId,
    },
  });
}

export async function completeStage(tenantId: string, entryId: string) {
  return db.queueStageEntry.updateMany({
    where: { id: entryId, tenantId },
    data: { completedAt: new Date() },
  });
}

/**
 * A cheap "has anything changed" signature for the queue board — count of
 * stage entries plus the most recent start/completion timestamp among
 * today's appointments. Polled client-side (queue-live-refresh.tsx) so a
 * second staff member's update surfaces as a banner instead of silently
 * going unnoticed until someone happens to reload.
 */
export async function getQueueVersion(tenantId: string, appointmentIds: string[]) {
  if (appointmentIds.length === 0) return { count: 0, latest: 0 };

  const entries = await db.queueStageEntry.findMany({
    where: { tenantId, appointmentId: { in: appointmentIds } },
    select: { startedAt: true, completedAt: true },
  });

  const latest = entries.reduce((max, e) => {
    const t = Math.max(e.startedAt.getTime(), e.completedAt?.getTime() ?? 0);
    return Math.max(max, t);
  }, 0);

  return { count: entries.length, latest };
}

export async function setStageRemark(tenantId: string, entryId: string, remark: string) {
  return db.queueStageEntry.updateMany({
    where: { id: entryId, tenantId },
    data: { remark },
  });
}
