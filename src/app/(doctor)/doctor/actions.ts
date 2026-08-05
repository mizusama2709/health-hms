"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { updateAppointmentStatus } from "@/lib/appointments";
import { recordJourneyEvent } from "@/lib/journey";
import { createFollowUp } from "@/lib/followUps";
import { createLabOrder, linkLabOrdersToFollowUp } from "@/lib/lab";
import { createImagingOrder } from "@/lib/imaging";
import { createPrescription, searchMedicines } from "@/lib/pharmacy";
import { sendPrescriptionViaWhatsApp } from "@/lib/whatsapp";
import { withActionResult } from "@/lib/actionResult";
import { db } from "@/lib/db";
import { encryptPHI } from "@/lib/phiCrypto";
import { logAudit } from "@/lib/audit";
import { AppointmentStatus, JourneyStep, DoseTime, DurationUnit, ImagingModality } from "@prisma/client";

const MAX_PRESCRIPTION_ROWS = 50;

const STATUS_TO_JOURNEY_STEP: Partial<Record<AppointmentStatus, JourneyStep>> = {
  COMPLETED: "OPD_COMPLETED",
};

async function requireOwnAppointment(tenantId: string, appointmentId: string, userId: string) {
  const doctor = await db.doctor.findUnique({ where: { userId } });
  if (!doctor) throw new Error("Not authorized");
  const appointment = await db.appointment.findFirst({ where: { id: appointmentId, tenantId, doctorId: doctor.id } });
  if (!appointment) throw new Error("Appointment not found");
  return appointment;
}

export async function setAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
  const session = await auth();
  if (session?.user?.role !== "DOCTOR") throw new Error("Not authorized");

  const tenantId = await requireTenantId();
  await requireOwnAppointment(tenantId, appointmentId, session.user.id);
  await updateAppointmentStatus(appointmentId, tenantId, status, status === "CANCELLED" ? "DOCTOR" : undefined);

  const journeyStep = STATUS_TO_JOURNEY_STEP[status];
  if (journeyStep) {
    const appointment = await db.appointment.findUnique({ where: { id: appointmentId } });
    if (appointment) {
      await recordJourneyEvent({
        tenantId,
        appointmentId,
        patientId: appointment.patientId,
        step: journeyStep,
        recordedById: session.user.id,
      });
    }
  }

  revalidatePath("/doctor");
}

export async function completeVisitAction(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "DOCTOR") throw new Error("Not authorized");

  const tenantId = await requireTenantId();
  const appointmentId = formData.get("appointmentId") as string;
  const notes = formData.get("notes") as string;
  const diagnosis = (formData.get("diagnosis") as string) || undefined;
  const treatmentPlan = (formData.get("treatmentPlan") as string) || undefined;
  const followUpNeeded = formData.get("followUpNeeded") === "true";
  const followUpDueDate = formData.get("followUpDueDate") as string;
  const followUpInstructions = (formData.get("followUpInstructions") as string) || "";

  if (!notes) throw new Error("Visit notes are required to complete the visit");

  const appointment = await requireOwnAppointment(tenantId, appointmentId, session.user.id);

  const encNotes = encryptPHI(notes);
  const encDiagnosis = diagnosis ? encryptPHI(diagnosis) : diagnosis;
  const encTreatmentPlan = treatmentPlan ? encryptPHI(treatmentPlan) : treatmentPlan;

  await db.visitRecord.upsert({
    where: { appointmentId },
    update: { notes: encNotes, diagnosis: encDiagnosis, prescription: encTreatmentPlan },
    create: { appointmentId, notes: encNotes, diagnosis: encDiagnosis, prescription: encTreatmentPlan },
  });

  await logAudit({
    tenantId,
    userId: session.user.id,
    userEmail: session.user.email,
    action: "VISIT_RECORD_WRITE",
    entityType: "VisitRecord",
    entityId: appointmentId,
    meta: { patientId: appointment.patientId },
  });

  await updateAppointmentStatus(appointmentId, tenantId, "COMPLETED");
  await recordJourneyEvent({
    tenantId,
    appointmentId,
    patientId: appointment.patientId,
    step: "OPD_COMPLETED",
    recordedById: session.user.id,
  });

  if (followUpNeeded) {
    if (!followUpDueDate) throw new Error("Choose a due date for the follow-up call");
    if (!followUpInstructions.trim()) throw new Error("Write what the nurse should check on the follow-up call");

    const followUp = await createFollowUp({
      tenantId,
      appointmentId,
      dueDate: new Date(followUpDueDate),
      focusInstructions: followUpInstructions,
      prescribedById: session.user.id,
    });

    await linkLabOrdersToFollowUp(tenantId, appointmentId, followUp.id);
  }

  revalidatePath("/doctor");
  revalidatePath("/admin/schedule/reminders");
}

export const completeVisitActionResult = withActionResult(completeVisitAction, "Visit completed");

export async function prescribeMedicines(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "DOCTOR") throw new Error("Not authorized");

  const tenantId = await requireTenantId();
  const appointmentId = formData.get("appointmentId") as string;
  const patientId = formData.get("patientId") as string;

  const rowCount = Math.min(Number(formData.get("rowCount")) || 0, MAX_PRESCRIPTION_ROWS);
  const items = [];
  for (let i = 0; i < rowCount; i++) {
    const medicineId = formData.get(`medicineId_${i}`) as string;
    if (!medicineId) continue;

    const quantity = Number(formData.get(`quantity_${i}`));
    const doseTimes = formData.getAll(`doseTimes_${i}`) as DoseTime[];
    const durationValueRaw = formData.get(`durationValue_${i}`) as string;
    const durationUnitRaw = formData.get(`durationUnit_${i}`) as string;
    const dosageInstructions = (formData.get(`dosageInstructions_${i}`) as string) || undefined;

    items.push({
      medicineId,
      quantity,
      doseTimes,
      durationValue: durationValueRaw ? Number(durationValueRaw) : undefined,
      durationUnit: (durationUnitRaw || undefined) as DurationUnit | undefined,
      dosageInstructions,
    });
  }

  if (items.length === 0) throw new Error("Select at least one medicine to prescribe");

  await requireOwnAppointment(tenantId, appointmentId, session.user.id);

  const prescription = await createPrescription({
    tenantId,
    patientId,
    appointmentId,
    recordedById: session.user.id,
    items,
  });

  await sendPrescriptionViaWhatsApp({ tenantId, prescriptionId: prescription.id });

  revalidatePath("/doctor");
}

export const prescribeMedicinesActionResult = withActionResult(prescribeMedicines, "Prescription sent");

export async function orderLabTests(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "DOCTOR") throw new Error("Not authorized");

  const tenantId = await requireTenantId();
  const appointmentId = formData.get("appointmentId") as string;
  const patientId = formData.get("patientId") as string;
  const testIds = formData.getAll("testIds") as string[];
  const patientConsented = formData.get("patientConsented") === "true";

  if (testIds.length === 0) throw new Error("Select at least one test to order");
  if (!patientConsented) throw new Error("Patient consent is required before ordering a lab test");

  await requireOwnAppointment(tenantId, appointmentId, session.user.id);

  await createLabOrder({
    tenantId,
    patientId,
    appointmentId,
    orderedById: session.user.id,
    testIds,
    patientConsentedAt: new Date(),
  });

  revalidatePath("/doctor");
}

export const orderLabTestsActionResult = withActionResult(orderLabTests, "Lab tests ordered");

export async function searchMedicinesAction(query: string) {
  const session = await auth();
  if (session?.user?.role !== "DOCTOR") throw new Error("Not authorized");
  const tenantId = await requireTenantId();
  return searchMedicines(tenantId, query);
}

export async function orderImagingStudy(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "DOCTOR") throw new Error("Not authorized");

  const tenantId = await requireTenantId();
  const appointmentId = formData.get("appointmentId") as string;
  const patientId = formData.get("patientId") as string;
  const modality = formData.get("modality") as ImagingModality;
  const description = (formData.get("description") as string) || undefined;
  const patientConsented = formData.get("patientConsented") === "true";

  if (!modality) throw new Error("Select a modality to order");
  if (!patientConsented) throw new Error("Patient consent is required before ordering an imaging study");

  await requireOwnAppointment(tenantId, appointmentId, session.user.id);

  await createImagingOrder({
    tenantId,
    patientId,
    appointmentId,
    orderedById: session.user.id,
    modality,
    description,
    patientConsentedAt: new Date(),
  });

  revalidatePath("/doctor");
}

export const orderImagingStudyActionResult = withActionResult(orderImagingStudy, "Imaging study ordered");
