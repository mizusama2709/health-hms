import { db } from "@/lib/db";
import type { FollowUpNextAction, FollowUpOutcome, FollowUpStatus } from "@prisma/client";

export async function createFollowUp(params: {
  tenantId: string;
  appointmentId: string;
  dueDate: Date;
  focusInstructions: string;
  prescribedById?: string;
}) {
  return db.followUp.upsert({
    where: { appointmentId: params.appointmentId },
    update: {},
    create: {
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      dueDate: params.dueDate,
      focusInstructions: params.focusInstructions,
      prescribedById: params.prescribedById,
    },
  });
}

export async function scheduleReminder(params: {
  tenantId: string;
  followUpId: string;
  reminderAt: Date;
  reminderMessage: string;
}) {
  return db.followUp.updateMany({
    where: { id: params.followUpId, tenantId: params.tenantId },
    data: { reminderAt: params.reminderAt, reminderMessage: params.reminderMessage, reminderScheduled: true },
  });
}

export async function listFollowUps(tenantId: string, filters?: { status?: FollowUpStatus; doctorId?: string }) {
  const followUps = await db.followUp.findMany({
    where: {
      tenantId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.doctorId && { appointment: { doctorId: filters.doctorId } }),
    },
    include: {
      appointment: {
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          visitRecord: true,
          prescriptions: { include: { items: { include: { medicine: true } } } },
        },
      },
      callLogs: { orderBy: { calledAt: "desc" } },
      linkedLabOrders: { include: { items: { include: { labTest: true } } } },
    },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  return followUps.map((f) => ({ ...f, isOverdue: f.status === "PENDING" && f.dueDate.getTime() < now.getTime() }));
}

export async function listFollowUpsDueToday(tenantId: string, limit = 5) {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [dueToday, totalDueToday] = await Promise.all([
    db.followUp.findMany({
      where: { tenantId, status: "PENDING", dueDate: { lte: endOfToday } },
      include: { appointment: { include: { patient: { include: { user: true } } } } },
      orderBy: { dueDate: "asc" },
      take: limit,
    }),
    db.followUp.count({ where: { tenantId, status: "PENDING", dueDate: { lte: endOfToday } } }),
  ]);

  const now = new Date();
  return {
    dueToday: dueToday.map((f) => ({ ...f, isOverdue: f.dueDate.getTime() < now.getTime() })),
    totalDueToday,
  };
}

export async function logFollowUpCall(params: {
  tenantId: string;
  followUpId: string;
  calledById: string;
  outcome: FollowUpOutcome;
  notes: string;
  nextAction: FollowUpNextAction;
  nextFollowUpAt?: Date;
}) {
  return db.$transaction(async (tx) => {
    const followUp = await tx.followUp.findFirstOrThrow({
      where: { id: params.followUpId, tenantId: params.tenantId },
    });

    const callLog = await tx.followUpCallLog.create({
      data: {
        tenantId: params.tenantId,
        followUpId: params.followUpId,
        calledById: params.calledById,
        outcome: params.outcome,
        notes: params.notes,
        nextAction: params.nextAction,
        nextFollowUpAt: params.nextFollowUpAt,
      },
    });

    const status: FollowUpStatus =
      params.nextAction === "ESCALATE_TO_DOCTOR"
        ? "ESCALATED"
        : params.nextAction === "ANOTHER_CALL_SCHEDULED" && params.nextFollowUpAt
        ? "PENDING"
        : "COMPLETED";

    await tx.followUp.update({
      where: { id: followUp.id },
      data: {
        status,
        ...(status === "PENDING" && params.nextFollowUpAt && { dueDate: params.nextFollowUpAt }),
      },
    });

    return callLog;
  });
}

export async function cancelFollowUp(tenantId: string, followUpId: string) {
  return db.followUp.updateMany({
    where: { id: followUpId, tenantId },
    data: { status: "CANCELLED" },
  });
}

export async function getFollowUpStats(tenantId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pending, overdue, completedThisMonth, escalated, outcomeBreakdown] = await Promise.all([
    db.followUp.count({ where: { tenantId, status: "PENDING" } }),
    db.followUp.count({ where: { tenantId, status: "PENDING", dueDate: { lt: now } } }),
    db.followUp.count({ where: { tenantId, status: "COMPLETED", updatedAt: { gte: monthStart } } }),
    db.followUp.count({ where: { tenantId, status: "ESCALATED" } }),
    db.followUpCallLog.groupBy({
      by: ["outcome"],
      where: { tenantId, calledAt: { gte: monthStart } },
      _count: { _all: true },
    }),
  ]);

  return {
    pending,
    overdue,
    completedThisMonth,
    escalated,
    outcomeBreakdown: outcomeBreakdown.map((o) => ({ outcome: o.outcome, count: o._count._all })),
  };
}
