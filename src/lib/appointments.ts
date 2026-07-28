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
