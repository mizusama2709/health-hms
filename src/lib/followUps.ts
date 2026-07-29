import { db } from "@/lib/db";

export async function createFollowUp(params: { appointmentId: string; dueDate: Date }) {
  return db.followUp.upsert({
    where: { appointmentId: params.appointmentId },
    update: {},
    create: { appointmentId: params.appointmentId, dueDate: params.dueDate },
  });
}

export async function scheduleReminder(params: {
  tenantId: string;
  followUpId: string;
  reminderAt: Date;
  reminderMessage: string;
}) {
  return db.followUp.updateMany({
    where: { id: params.followUpId, appointment: { tenantId: params.tenantId } },
    data: { reminderAt: params.reminderAt, reminderMessage: params.reminderMessage, reminderScheduled: true },
  });
}

export async function listFollowUps(tenantId: string, filters?: { status?: string; dueBefore?: Date }) {
  return db.followUp.findMany({
    where: {
      appointment: { tenantId },
      ...(filters?.status && { status: filters.status }),
      ...(filters?.dueBefore && { dueDate: { lte: filters.dueBefore } }),
    },
    include: { appointment: { include: { patient: { include: { user: true } }, doctor: { include: { user: true } } } } },
    orderBy: { dueDate: "asc" },
  });
}

export async function markFollowUpStatus(tenantId: string, followUpId: string, status: string) {
  return db.followUp.updateMany({
    where: { id: followUpId, appointment: { tenantId } },
    data: { status },
  });
}
