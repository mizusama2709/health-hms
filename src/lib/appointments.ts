import { db } from "@/lib/db";
import {
  AppointmentStatus,
  AppointmentType,
  ServiceType,
  AppointmentSource,
  PaymentMode,
} from "@prisma/client";

export async function listAppointmentsForDoctor(doctorId: string, tenantId: string) {
  return db.appointment.findMany({
    where: { doctorId, tenantId },
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
  status: AppointmentStatus
) {
  return db.appointment.updateMany({
    where: { id: appointmentId, tenantId },
    data: { status },
  });
}

export async function updateAppointmentTiming(
  appointmentId: string,
  tenantId: string,
  datetime: Date
) {
  return db.appointment.updateMany({
    where: { id: appointmentId, tenantId },
    data: { datetime },
  });
}

export async function rescheduleAppointment(
  appointmentId: string,
  tenantId: string,
  newDatetime: Date
) {
  return updateAppointmentTiming(appointmentId, tenantId, newDatetime);
}

export async function cancelAppointment(appointmentId: string, tenantId: string) {
  return updateAppointmentStatus(appointmentId, tenantId, "CANCELLED");
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

export async function listDoctorsForTenant(tenantId: string) {
  return db.doctor.findMany({
    where: { tenantId },
    include: { user: true },
  });
}
