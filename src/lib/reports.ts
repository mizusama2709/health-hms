import { db } from "@/lib/db";
import { JourneyStep } from "@prisma/client";

export async function getMasterReport(
  tenantId: string,
  filters: { from?: Date; to?: Date; doctorId?: string }
) {
  const dateRange =
    filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined;

  const [totalAppointments, consultations, invoiceServiceTypeAgg, invoiceAgg, refundAgg] =
    await Promise.all([
      db.appointment.count({
        where: {
          tenantId,
          ...(filters.doctorId && { doctorId: filters.doctorId }),
          ...(dateRange && { datetime: dateRange }),
        },
      }),
      db.appointment.count({
        where: {
          tenantId,
          serviceType: "CONSULTATION",
          ...(filters.doctorId && { doctorId: filters.doctorId }),
          ...(dateRange && { datetime: dateRange }),
        },
      }),
      db.invoice.groupBy({
        by: ["serviceType"],
        where: {
          tenantId,
          ...(dateRange && { createdAt: dateRange }),
        },
        _count: { _all: true },
      }),
      db.invoice.aggregate({
        where: {
          tenantId,
          ...(dateRange && { createdAt: dateRange }),
        },
        _sum: { totalAmount: true, discountAmount: true },
      }),
      db.refund.aggregate({
        where: {
          tenantId,
          ...(dateRange && { refundedAt: dateRange }),
        },
        _sum: { amount: true },
      }),
    ]);

  const pharmacy = invoiceServiceTypeAgg.find((a) => a.serviceType === "PHARMACY")?._count._all ?? 0;
  const lab = invoiceServiceTypeAgg.find((a) => a.serviceType === "LAB")?._count._all ?? 0;

  return {
    totalAppointments,
    consultations,
    pharmacy,
    lab,
    totalRevenue: Number(invoiceAgg._sum.totalAmount ?? 0),
    totalDiscounts: Number(invoiceAgg._sum.discountAmount ?? 0),
    totalRefunds: Number(refundAgg._sum.amount ?? 0),
  };
}

export async function listTransactions(
  tenantId: string,
  filters?: { from?: Date; to?: Date; status?: string }
) {
  return db.payment.findMany({
    where: {
      tenantId,
      ...(filters?.status && { status: filters.status as never }),
      ...(filters?.from || filters?.to
        ? { paidAt: { gte: filters?.from, lte: filters?.to } }
        : {}),
    },
    include: { invoice: { include: { patient: { include: { user: true } } } } },
    orderBy: { paidAt: "desc" },
  });
}

const STEP_TRANSITIONS: [JourneyStep, JourneyStep][] = [
  ["APPOINTMENT_BOOKED", "VITALS_TAKEN"],
  ["VITALS_TAKEN", "OPD_STARTED"],
  ["OPD_STARTED", "OPD_COMPLETED"],
  ["OPD_COMPLETED", "LAB_ORDERED"],
  ["LAB_ORDERED", "LAB_COMPLETED"],
  ["LAB_COMPLETED", "MEDICINES_PRESCRIBED"],
];

export async function getSelfEfficacyReport(
  tenantId: string,
  filters: { from?: Date; to?: Date; doctorId?: string }
) {
  const appointments = await db.appointment.findMany({
    where: {
      tenantId,
      ...(filters.doctorId && { doctorId: filters.doctorId }),
      ...(filters.from || filters.to
        ? { datetime: { gte: filters.from, lte: filters.to } }
        : {}),
    },
    select: { id: true, journeyEvents: { orderBy: { occurredAt: "asc" } } },
  });

  const transitionDurations = new Map<string, number[]>();

  for (const appt of appointments) {
    const byStep = new Map<JourneyStep, Date>();
    for (const event of appt.journeyEvents) {
      if (!byStep.has(event.step)) byStep.set(event.step, event.occurredAt);
    }
    for (const [from, to] of STEP_TRANSITIONS) {
      const fromTime = byStep.get(from);
      const toTime = byStep.get(to);
      if (fromTime && toTime && toTime >= fromTime) {
        const key = `${from}→${to}`;
        const minutes = (toTime.getTime() - fromTime.getTime()) / 60000;
        transitionDurations.set(key, [...(transitionDurations.get(key) ?? []), minutes]);
      }
    }
  }

  const transitions = STEP_TRANSITIONS.map(([from, to]) => {
    const key = `${from}→${to}`;
    const durations = transitionDurations.get(key) ?? [];
    const avgMinutes =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    return { from, to, sampleSize: durations.length, avgMinutes };
  });

  return { appointmentsConsidered: appointments.length, transitions };
}
