import { db } from "@/lib/db";
import {
  AppointmentStatus,
  AppointmentType,
  ServiceType,
  AppointmentSource,
  PaymentMode,
  CancelledBy,
} from "@prisma/client";

export async function listAppointmentsForDoctor(
  doctorId: string,
  tenantId: string,
  filters?: { scope?: "today" | "upcoming" | "all" }
) {
  const scope = filters?.scope ?? "all";
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  let datetimeWhere: { gte?: Date; lte?: Date } | undefined;
  if (scope === "today") {
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    datetimeWhere = { gte: start, lte: end };
  } else if (scope === "upcoming") {
    datetimeWhere = { gte: start };
  }

  return db.appointment.findMany({
    where: { doctorId, tenantId, ...(datetimeWhere && { datetime: datetimeWhere }) },
    include: { patient: { include: { user: true } } },
    orderBy: { datetime: "asc" },
  });
}

export async function listAppointmentsForTenant(
  tenantId: string,
  filters?: { doctorId?: string; status?: AppointmentStatus; from?: Date; to?: Date }
) {
  return db.appointment.findMany({
    where: {
      tenantId,
      ...(filters?.doctorId && { doctorId: filters.doctorId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.from || filters?.to
        ? { datetime: { gte: filters?.from, lte: filters?.to } }
        : {}),
    },
    include: {
      doctor: { include: { user: true } },
      patient: { include: { user: true } },
    },
    orderBy: { datetime: "asc" },
  });
}

export async function getAppointmentForCalendar(doctorId: string, tenantId: string, day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  return db.appointment.findMany({
    where: { doctorId, tenantId, datetime: { gte: start, lte: end } },
    include: { patient: { include: { user: true } } },
    orderBy: { datetime: "asc" },
  });
}

export async function getAppointmentsForRange(doctorId: string, tenantId: string, start: Date, end: Date) {
  return db.appointment.findMany({
    where: { doctorId, tenantId, datetime: { gte: start, lte: end } },
    include: { patient: { include: { user: true } } },
    orderBy: { datetime: "asc" },
  });
}

export const DOCTOR_WORKING_HOURS = { startHour: 9, endHour: 17 };
export const APPOINTMENT_DURATION_MINUTES = 30;

export function getScheduleStats(todaysAppointments: { datetime: Date; status: AppointmentStatus }[]) {
  const active = todaysAppointments.filter((a) => a.status !== "CANCELLED");
  const bookedMinutes = active.length * APPOINTMENT_DURATION_MINUTES;
  const workingMinutes = (DOCTOR_WORKING_HOURS.endHour - DOCTOR_WORKING_HOURS.startHour) * 60;
  const freeMinutes = Math.max(0, workingMinutes - bookedMinutes);

  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const withinWorkingHours = nowHour >= DOCTOR_WORKING_HOURS.startHour && nowHour < DOCTOR_WORKING_HOURS.endHour;
  const inAppointmentNow = active.some((a) => {
    const start = new Date(a.datetime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    return nowHour >= startHour && nowHour < startHour + APPOINTMENT_DURATION_MINUTES / 60;
  });

  const status = inAppointmentNow ? "In consultation" : withinWorkingHours ? "Available" : "Off hours";

  return {
    bookedCount: active.length,
    bookedHours: bookedMinutes / 60,
    freeHours: freeMinutes / 60,
    workingHoursLabel: `${String(DOCTOR_WORKING_HOURS.startHour).padStart(2, "0")}:00 – ${String(DOCTOR_WORKING_HOURS.endHour).padStart(2, "0")}:00`,
    status,
  };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  tenantId: string,
  status: AppointmentStatus,
  cancelledBy?: CancelledBy,
  doctorId?: string
) {
  return db.appointment.updateMany({
    where: { id: appointmentId, tenantId, ...(doctorId && { doctorId }) },
    data: { status, ...(status === "CANCELLED" && { cancelledBy: cancelledBy ?? "STAFF" }) },
  });
}

export async function updateAppointmentTiming(
  appointmentId: string,
  tenantId: string,
  datetime: Date,
  doctorId?: string
) {
  return db.appointment.updateMany({
    where: { id: appointmentId, tenantId, ...(doctorId && { doctorId }) },
    data: { datetime },
  });
}

export async function updateAppointmentFee(appointmentId: string, tenantId: string, feeAmount: number, doctorId?: string) {
  return db.appointment.updateMany({
    where: { id: appointmentId, tenantId, ...(doctorId && { doctorId }) },
    data: { feeAmount },
  });
}

export async function getAppointmentDetailed(appointmentId: string, tenantId: string, doctorId?: string) {
  return db.appointment.findFirst({
    where: { id: appointmentId, tenantId, ...(doctorId && { doctorId }) },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      invoices: { orderBy: { createdAt: "desc" }, take: 1, include: { payments: { orderBy: { createdAt: "desc" } }, lineItems: true } },
    },
  });
}

export async function rescheduleAppointment(
  appointmentId: string,
  tenantId: string,
  newDatetime: Date
) {
  return updateAppointmentTiming(appointmentId, tenantId, newDatetime);
}

export async function cancelAppointment(appointmentId: string, tenantId: string, cancelledBy: CancelledBy = "STAFF", doctorId?: string) {
  return updateAppointmentStatus(appointmentId, tenantId, "CANCELLED", cancelledBy, doctorId);
}

export async function createAppointment(params: {
  tenantId: string;
  doctorId: string;
  patientId: string;
  datetime: Date;
  type?: AppointmentType;
  serviceType?: ServiceType;
  source?: AppointmentSource;
  feeAmount?: number;
  paymentMode?: PaymentMode;
}) {
  return db.appointment.create({
    data: {
      tenantId: params.tenantId,
      doctorId: params.doctorId,
      patientId: params.patientId,
      datetime: params.datetime,
      type: params.type ?? "NEW",
      serviceType: params.serviceType ?? "CONSULTATION",
      source: params.source ?? "MANUAL",
      feeAmount: params.feeAmount,
      paymentMode: params.paymentMode,
    },
  });
}

export type AppointmentPaymentFilter = "PENDING_PAYMENT" | "PARTIAL" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type AppointmentDateFilter = "today" | "tomorrow" | "week" | "nextWeek";

function dateRangeFor(filter: AppointmentDateFilter): { gte: Date; lte: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (filter === "today") {
    end.setHours(23, 59, 59, 999);
  } else if (filter === "tomorrow") {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
    end.setHours(23, 59, 59, 999);
  } else if (filter === "week") {
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(start.getDate() + 7);
    end.setDate(end.getDate() + 13);
    end.setHours(23, 59, 59, 999);
  }
  return { gte: start, lte: end };
}

export async function listAppointmentsForDoctorDetailed(
  doctorId: string,
  tenantId: string,
  filters?: { search?: string; date?: AppointmentDateFilter; payment?: AppointmentPaymentFilter }
) {
  const appointments = await db.appointment.findMany({
    where: {
      doctorId,
      tenantId,
      ...(filters?.date && { datetime: dateRangeFor(filters.date) }),
      ...(filters?.search && {
        patient: {
          user: {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { phone: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        },
      }),
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      invoices: { orderBy: { createdAt: "desc" }, take: 1, include: { payments: { orderBy: { createdAt: "desc" } } } },
    },
    orderBy: { datetime: "desc" },
  });

  const withPaymentInfo = appointments.map((a) => {
    const invoice = a.invoices[0] ?? null;
    let paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID" | "NONE" = "NONE";
    if (invoice) paymentStatus = invoice.status === "VOID" ? "NONE" : invoice.status;
    return { ...a, invoice, paymentStatus };
  });

  if (!filters?.payment) return withPaymentInfo;

  return withPaymentInfo.filter((a) => {
    switch (filters.payment) {
      case "PENDING_PAYMENT":
        return a.paymentStatus === "UNPAID" || a.paymentStatus === "NONE";
      case "PARTIAL":
        return a.paymentStatus === "PARTIALLY_PAID";
      case "CONFIRMED":
        return a.status === "BOOKED";
      case "COMPLETED":
        return a.status === "COMPLETED";
      case "CANCELLED":
        return a.status === "CANCELLED" || a.status === "NO_SHOW";
      default:
        return true;
    }
  });
}

export async function getDoctorAppointmentStats(doctorId: string, tenantId: string) {
  const appointments = await db.appointment.findMany({
    where: { doctorId, tenantId },
    include: { invoices: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const total = appointments.length;
  const confirmed = appointments.filter((a) => a.status === "BOOKED").length;
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const pendingPayment = appointments.filter((a) => {
    if (a.status === "CANCELLED" || a.status === "NO_SHOW") return false;
    const invoice = a.invoices[0];
    return !invoice || invoice.status === "UNPAID" || invoice.status === "PARTIALLY_PAID";
  }).length;

  const revenueResult = await db.payment.aggregate({
    where: { tenantId, status: "SUCCESS", invoice: { appointment: { doctorId } } },
    _sum: { amount: true },
  });

  return {
    total,
    confirmed,
    completed,
    pendingPayment,
    revenue: Number(revenueResult._sum.amount ?? 0),
  };
}

export async function getAppointmentForCalendarTenant(tenantId: string, day: Date, doctorId?: string) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  return db.appointment.findMany({
    where: { tenantId, ...(doctorId && { doctorId }), datetime: { gte: start, lte: end } },
    include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
    orderBy: { datetime: "asc" },
  });
}

export async function getAppointmentsForRangeTenant(tenantId: string, start: Date, end: Date, doctorId?: string) {
  return db.appointment.findMany({
    where: { tenantId, ...(doctorId && { doctorId }), datetime: { gte: start, lte: end } },
    include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
    orderBy: { datetime: "asc" },
  });
}

export async function getTenantScheduleStats(tenantId: string, doctorId?: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaysAppointments = await db.appointment.findMany({
    where: { tenantId, ...(doctorId && { doctorId }), datetime: { gte: todayStart, lte: todayEnd } },
    select: { datetime: true, status: true },
  });

  return getScheduleStats(todaysAppointments);
}

export async function listAppointmentsForTenantDetailed(
  tenantId: string,
  filters?: { search?: string; date?: AppointmentDateFilter; payment?: AppointmentPaymentFilter; doctorId?: string }
) {
  const appointments = await db.appointment.findMany({
    where: {
      tenantId,
      ...(filters?.doctorId && { doctorId: filters.doctorId }),
      ...(filters?.date && { datetime: dateRangeFor(filters.date) }),
      ...(filters?.search && {
        patient: {
          user: {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { phone: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        },
      }),
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      invoices: { orderBy: { createdAt: "desc" }, take: 1, include: { payments: { orderBy: { createdAt: "desc" } } } },
    },
    orderBy: { datetime: "desc" },
  });

  const withPaymentInfo = appointments.map((a) => {
    const invoice = a.invoices[0] ?? null;
    let paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID" | "NONE" = "NONE";
    if (invoice) paymentStatus = invoice.status === "VOID" ? "NONE" : invoice.status;
    return { ...a, invoice, paymentStatus };
  });

  if (!filters?.payment) return withPaymentInfo;

  return withPaymentInfo.filter((a) => {
    switch (filters.payment) {
      case "PENDING_PAYMENT":
        return a.paymentStatus === "UNPAID" || a.paymentStatus === "NONE";
      case "PARTIAL":
        return a.paymentStatus === "PARTIALLY_PAID";
      case "CONFIRMED":
        return a.status === "BOOKED";
      case "COMPLETED":
        return a.status === "COMPLETED";
      case "CANCELLED":
        return a.status === "CANCELLED" || a.status === "NO_SHOW";
      default:
        return true;
    }
  });
}

export async function getTenantAppointmentStats(tenantId: string, doctorId?: string) {
  const appointments = await db.appointment.findMany({
    where: { tenantId, ...(doctorId && { doctorId }) },
    include: { invoices: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const total = appointments.length;
  const confirmed = appointments.filter((a) => a.status === "BOOKED").length;
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const pendingPayment = appointments.filter((a) => {
    if (a.status === "CANCELLED" || a.status === "NO_SHOW") return false;
    const invoice = a.invoices[0];
    return !invoice || invoice.status === "UNPAID" || invoice.status === "PARTIALLY_PAID";
  }).length;

  const revenueResult = await db.payment.aggregate({
    where: {
      tenantId,
      status: "SUCCESS",
      ...(doctorId && { invoice: { appointment: { doctorId } } }),
    },
    _sum: { amount: true },
  });

  return {
    total,
    confirmed,
    completed,
    pendingPayment,
    revenue: Number(revenueResult._sum.amount ?? 0),
  };
}

export async function listDoctorsForTenant(tenantId: string) {
  return db.doctor.findMany({
    where: { tenantId },
    include: { user: true },
  });
}
