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
