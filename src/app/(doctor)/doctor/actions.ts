"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { updateAppointmentStatus } from "@/lib/appointments";
import { recordJourneyEvent } from "@/lib/journey";
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

  revalidatePath("/doctor");
}
