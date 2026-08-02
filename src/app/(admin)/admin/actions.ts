"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { createAppointment } from "@/lib/appointments";
import { recordJourneyEvent } from "@/lib/journey";
import { sendInvoiceViaWhatsApp } from "@/lib/whatsapp";
import { searchPatients } from "@/lib/patients";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN_RECEPTION" && role !== "SUPER_ADMIN") throw new Error("Not authorized");
  return session!;
}

export async function searchPatientsAction(query: string) {
  await requireAdmin();
  const tenantId = await requireTenantId();
  return searchPatients(tenantId, query);
}

export async function bookWalkIn(formData: FormData) {
  const session = await requireAdmin();
  const tenantId = await requireTenantId();
  const doctorId = formData.get("doctorId") as string;
  const patientId = formData.get("patientId") as string;
  const datetime = formData.get("datetime") as string;

  const patient = await db.patient.findFirst({ where: { id: patientId, tenantId } });
  if (!patient) throw new Error("Select a patient before booking");

  const appointment = await createAppointment({
    tenantId,
    doctorId,
    patientId: patient.id,
    datetime: new Date(datetime),
  });

  await recordJourneyEvent({
    tenantId,
    appointmentId: appointment.id,
    patientId: patient.id,
    step: "APPOINTMENT_BOOKED",
    recordedById: session.user.id,
  });

  revalidatePath("/admin");
}

export async function addDoctor(formData: FormData) {
  await requireAdmin();
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const specialty = formData.get("specialty") as string;
  const password = formData.get("password") as string;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error(`A user with email ${email} already exists`);

  const passwordHash = await bcrypt.hash(password, 10);

  await db.user.create({
    data: {
      email,
      name,
      role: "DOCTOR",
      passwordHash,
      tenantId,
      doctor: { create: { tenantId, specialty } },
    },
  });

  revalidatePath("/admin");
}

export async function sendInvoiceWhatsApp(formData: FormData) {
  await requireAdmin();
  const tenantId = await requireTenantId();

  const invoiceId = formData.get("invoiceId") as string;
  const toPhone = formData.get("toPhone") as string;

  await sendInvoiceViaWhatsApp({ tenantId, invoiceId, toPhone });

  revalidatePath("/admin");
}
