import { db } from "@/lib/db";
import { AppointmentStatus, AppointmentType } from "@prisma/client";

export async function listAppointmentsForDoctor(doctorId: string, tenantId: string) {
  return db.appointment.findMany({
    where: { doctorId, tenantId },
    include: { patient: { include: { user: true } } },
    orderBy: { datetime: "asc" },
  });
}

export async function listAppointmentsForTenant(tenantId: string) {
  return db.appointment.findMany({
    where: { tenantId },
    include: {
      doctor: { include: { user: true } },
      patient: { include: { user: true } },
    },
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

export async function createAppointment(params: {
  tenantId: string;
  doctorId: string;
  patientId: string;
  datetime: Date;
  type?: AppointmentType;
}) {
  return db.appointment.create({
    data: {
      tenantId: params.tenantId,
      doctorId: params.doctorId,
      patientId: params.patientId,
      datetime: params.datetime,
      type: params.type ?? "NEW",
    },
  });
}

export async function listDoctorsForTenant(tenantId: string) {
  return db.doctor.findMany({
    where: { tenantId },
    include: { user: true },
  });
}
