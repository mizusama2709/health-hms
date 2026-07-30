"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { updateAppointmentStatus } from "@/lib/appointments";
import { recordJourneyEvent } from "@/lib/journey";
import { createFollowUp } from "@/lib/followUps";
import { createLabOrder } from "@/lib/lab";
import { db } from "@/lib/db";
import { AppointmentStatus, JourneyStep } from "@prisma/client";

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
