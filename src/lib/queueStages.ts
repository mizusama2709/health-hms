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

export async function setStageRemark(tenantId: string, entryId: string, remark: string) {
  return db.queueStageEntry.updateMany({
    where: { id: entryId, tenantId },
    data: { remark },
  });
}
