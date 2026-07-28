import { db } from "@/lib/db";
import { JourneyStep } from "@prisma/client";

export async function recordJourneyEvent(params: {
  tenantId: string;
  appointmentId: string;
  patientId: string;
  step: JourneyStep;
  recordedById?: string;
}) {
  return db.patientJourneyEvent.create({
    data: {
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      step: params.step,
      recordedById: params.recordedById,
    },
  });
}

export async function listJourneyForAppointment(appointmentId: string, tenantId: string) {
  return db.patientJourneyEvent.findMany({
    where: { appointmentId, tenantId },
    orderBy: { occurredAt: "asc" },
  });
}

export async function getLatestJourneyStepsForAppointments(
  appointmentIds: string[],
  tenantId: string
): Promise<Map<string, JourneyStep>> {
  if (appointmentIds.length === 0) return new Map();

  const events = await db.patientJourneyEvent.findMany({
    where: { tenantId, appointmentId: { in: appointmentIds } },
    orderBy: { occurredAt: "asc" },
  });

  const latest = new Map<string, JourneyStep>();
  for (const event of events) {
    latest.set(event.appointmentId, event.step);
  }
  return latest;
}
