import { db } from "@/lib/db";
import { recordJourneyEvent } from "@/lib/journey";

export async function recordVitals(params: {
  tenantId: string;
  patientId: string;
  appointmentId?: string;
  bp?: string;
  glucose?: number;
  weight?: number;
  spo2?: number;
  recordedById?: string;
}) {
  const vitals = await db.vitals.create({
    data: {
      tenantId: params.tenantId,
      patientId: params.patientId,
      appointmentId: params.appointmentId,
      bp: params.bp,
      glucose: params.glucose,
      weight: params.weight,
      spo2: params.spo2,
      recordedById: params.recordedById,
    },
  });

  if (params.appointmentId) {
    await recordJourneyEvent({
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      step: "VITALS_TAKEN",
      recordedById: params.recordedById,
    });
  }

  return vitals;
}

export async function listVitalsForPatient(patientId: string, tenantId: string) {
  return db.vitals.findMany({
    where: { patientId, tenantId },
    orderBy: { recordedAt: "desc" },
  });
}
