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
import { withActionResult } from "@/lib/actionResult";
import { isUniqueConstraintViolation } from "@/lib/prismaErrors";
import { getBaseUrl } from "@/lib/baseUrl";

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

export const bookWalkInActionResult = withActionResult(bookWalkIn, "Walk-in booked");

export async function addDoctor(formData: FormData) {
  await requireAdmin();
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const specialty = formData.get("specialty") as string;
  const password = formData.get("password") as string;

  const passwordHash = await bcrypt.hash(password, 10);

  // No pre-check by email — see the matching comment in patients.ts
  // createPatient: since email is globally unique (not per-tenant), a
  // findUnique-by-email check would tell staff at one tenant whether an
  // email is registered at *any* tenant, a cross-tenant enumeration leak.
  try {
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
  } catch (e) {
    if (isUniqueConstraintViolation(e, "email")) {
      throw new Error("That email may already be registered — try a different one");
    }
    throw e;
  }

  revalidatePath("/admin");
}

export const addDoctorActionResult = withActionResult(addDoctor, "Doctor added");

export async function sendInvoiceWhatsApp(formData: FormData) {
  await requireAdmin();
  const tenantId = await requireTenantId();

  const invoiceId = formData.get("invoiceId") as string;
  const toPhone = formData.get("toPhone") as string;

  await sendInvoiceViaWhatsApp({ tenantId, invoiceId, toPhone, baseUrl: await getBaseUrl() });

  revalidatePath("/admin");
}

export const sendInvoiceWhatsAppActionResult = withActionResult(sendInvoiceWhatsApp, "Invoice sent via WhatsApp");
