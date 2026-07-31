"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { updateAppointmentStatus } from "@/lib/appointments";
import { recordJourneyEvent } from "@/lib/journey";
import { createFollowUp } from "@/lib/followUps";
import { createLabOrder } from "@/lib/lab";
import { createPrescription } from "@/lib/pharmacy";
import { db } from "@/lib/db";
import { AppointmentStatus, JourneyStep, DoseTime, DurationUnit } from "@prisma/client";

const PRESCRIPTION_ROW_COUNT = 5;

const STATUS_TO_JOURNEY_STEP: Partial<Record<AppointmentStatus, JourneyStep>> = {
  COMPLETED: "OPD_COMPLETED",
};

export async function setAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
  const session = await auth();
  if (session?.user?.role !== "DOCTOR") throw new Error("Not authorized");

  const tenantId = await requireTenantId();
  await updateAppointmentStatus(appointmentId, tenantId, status);

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

  if (status === "COMPLETED") {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    await createFollowUp({ appointmentId, dueDate });
  }

  revalidatePath("/doctor");
}

export async function prescribeMedicines(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "DOCTOR") throw new Error("Not authorized");

  const tenantId = await requireTenantId();
  const appointmentId = formData.get("appointmentId") as string;
  const patientId = formData.get("patientId") as string;

  const items = [];
  for (let i = 0; i < PRESCRIPTION_ROW_COUNT; i++) {
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

  if (items.length === 0) return;

  await createPrescription({
    tenantId,
    patientId,
    appointmentId,
    recordedById: session.user.id,
    items,
  });

  revalidatePath("/doctor");
}

export async function orderLabTests(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "DOCTOR") throw new Error("Not authorized");

  const tenantId = await requireTenantId();
  const appointmentId = formData.get("appointmentId") as string;
  const patientId = formData.get("patientId") as string;
  const testIds = formData.getAll("testIds") as string[];

  if (testIds.length === 0) return;

  await createLabOrder({
    tenantId,
    patientId,
    appointmentId,
    orderedById: session.user.id,
    testIds,
  });

  revalidatePath("/doctor");
}
