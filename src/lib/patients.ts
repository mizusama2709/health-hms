import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { Gender } from "@prisma/client";
import { decryptPHIMaybe } from "@/lib/phiCrypto";
import { logAudit } from "@/lib/audit";
import { isUniqueConstraintViolation } from "@/lib/prismaErrors";

export function computeAge(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > dateOfBirth.getMonth() ||
    (now.getMonth() === dateOfBirth.getMonth() && now.getDate() >= dateOfBirth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export async function searchPatients(tenantId: string, query: string, limit = 20) {
  const q = query.trim();
  const patients = await db.patient.findMany({
    where: {
      tenantId,
      ...(q && {
        OR: [
          { user: { name: { contains: q, mode: "insensitive" as const } } },
          { user: { phone: { contains: q, mode: "insensitive" as const } } },
          { user: { email: { contains: q, mode: "insensitive" as const } } },
        ],
      }),
    },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
    take: limit,
  });
  return patients.map((p) => ({
    value: p.id,
    label: `${p.user.name}${p.user.phone ? ` · ${p.user.phone}` : ""} (${p.user.email})`,
  }));
}

export async function createPatient(params: {
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  dateOfBirth?: Date;
  gender?: Gender;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);

  // No pre-check by email: since email is globally unique (not per-tenant),
  // a findUnique-by-email check run before create() would tell staff at one
  // tenant whether an email is registered at *any* tenant, not just their
  // own — a cross-tenant enumeration leak. Attempting the create and
  // catching the real constraint violation gives the same UX without it.
  try {
    return await db.user.create({
      data: {
        email: params.email,
        name: params.name,
        phone: params.phone,
        role: "PATIENT",
        passwordHash,
        tenantId: params.tenantId,
        patient: {
          create: {
            tenantId: params.tenantId,
            dateOfBirth: params.dateOfBirth,
            gender: params.gender,
          },
        },
      },
      include: { patient: true },
    });
  } catch (e) {
    if (isUniqueConstraintViolation(e, "email")) {
      throw new Error("That email may already be registered — try a different one");
    }
    throw e;
  }
}

export async function updatePatientProfile(
  patientId: string,
  tenantId: string,
  params: { name?: string; phone?: string; dateOfBirth?: Date | null; gender?: Gender | null }
) {
  const patient = await db.patient.findFirst({ where: { id: patientId, tenantId } });
  if (!patient) throw new Error("Patient not found");

  await db.patient.update({
    where: { id: patientId },
    data: { dateOfBirth: params.dateOfBirth, gender: params.gender },
  });

  if (params.name !== undefined || params.phone !== undefined) {
    await db.user.update({
      where: { id: patient.userId },
      data: {
        ...(params.name !== undefined && { name: params.name }),
        ...(params.phone !== undefined && { phone: params.phone }),
      },
    });
  }
}

export type PatientStatus =
  | "payment_pending"
  | "payment_collected"
  | "appointment_booked"
  | "follow_up"
  | "new";

export function patientDisplayId(patientId: string) {
  return patientId.slice(-6).toUpperCase();
}

export async function listDoctorsForFilter(tenantId: string) {
  return db.doctor.findMany({ where: { tenantId }, include: { user: true }, orderBy: { user: { name: "asc" } } });
}

export async function listPatients(
  tenantId: string,
  filters?: {
    search?: string;
    sort?: "newest" | "oldest";
    doctorId?: string;
    status?: PatientStatus;
  }
) {
  const patients = await db.patient.findMany({
    where: {
      tenantId,
      ...(filters?.search && {
        OR: [
          { user: { name: { contains: filters.search, mode: "insensitive" } } },
          { user: { email: { contains: filters.search, mode: "insensitive" } } },
          { user: { phone: { contains: filters.search, mode: "insensitive" } } },
          { id: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      user: true,
      appointments: {
        include: { doctor: { include: { user: true } }, followUp: true },
        orderBy: { datetime: "desc" },
      },
      invoices: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { user: { updatedAt: filters?.sort === "oldest" ? "asc" : "desc" } },
  });

  const withDerived = patients.map((p) => {
    const latestAppointment = p.appointments[0];
    const lastConsultation = p.appointments.find((a) => a.status === "COMPLETED") ?? null;
    const pendingInvoice = p.invoices.find((i) => i.status === "UNPAID" || i.status === "PARTIALLY_PAID");
    const paidInvoice = p.invoices.find((i) => i.status === "PAID");
    const pendingFollowUp = p.appointments.find((a) => a.followUp && a.followUp.status === "PENDING");

    let status: PatientStatus = "new";
    if (pendingInvoice) status = "payment_pending";
    else if (paidInvoice) status = "payment_collected";
    else if (latestAppointment?.status === "BOOKED") status = "appointment_booked";
    else if (pendingFollowUp) status = "follow_up";

    return {
      ...p,
      displayId: patientDisplayId(p.id),
      status,
      lastConsultation,
      latestAppointment,
    };
  });

  return withDerived.filter((p) => {
    if (filters?.status && p.status !== filters.status) return false;
    if (filters?.doctorId && p.latestAppointment?.doctorId !== filters.doctorId) return false;
    return true;
  });
}

export async function listPatientsPaged(
  tenantId: string,
  filters?: {
    search?: string;
    sort?: "newest" | "oldest";
    doctorId?: string;
    status?: PatientStatus;
    page?: number;
    pageSize?: number;
  }
) {
  // status/doctorId are derived fields computed after the query (see
  // listPatients above), so they can't be pushed into a Prisma where clause
  // — filter in memory first, then paginate the filtered set.
  const filtered = await listPatients(tenantId, filters);

  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = filters?.pageSize ?? 50;
  const total = filtered.length;
  const start = (page - 1) * pageSize;

  return {
    patients: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPatientWithHistory(
  patientId: string,
  tenantId: string,
  viewer?: { userId?: string | null; userEmail?: string | null },
) {
  const patient = await db.patient.findFirst({
    where: { id: patientId, tenantId },
    include: {
      user: true,
      appointments: {
        include: {
          doctor: { include: { user: true } },
          visitRecord: true,
          invoices: true,
        },
        orderBy: { datetime: "desc" },
      },
      vitals: {
        orderBy: { recordedAt: "desc" },
      },
    },
  });

  if (!patient) return patient;

  for (const appt of patient.appointments) {
    if (appt.visitRecord) {
      appt.visitRecord.notes = decryptPHIMaybe(appt.visitRecord.notes) ?? appt.visitRecord.notes;
      appt.visitRecord.diagnosis = decryptPHIMaybe(appt.visitRecord.diagnosis);
      appt.visitRecord.prescription = decryptPHIMaybe(appt.visitRecord.prescription);
    }
  }

  await logAudit({
    tenantId,
    userId: viewer?.userId,
    userEmail: viewer?.userEmail,
    action: "PATIENT_VIEW",
    entityType: "Patient",
    entityId: patientId,
  });

  return patient;
}
