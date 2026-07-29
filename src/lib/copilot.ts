import { db } from "@/lib/db";
import { listLabOrders } from "@/lib/lab";
import { listKnowledgeBaseDocuments } from "@/lib/knowledgeBase";
import { generateConsultSummary, isAiConfigured } from "@/lib/ai/client";

export async function generatePreConsultSummary(appointmentId: string, tenantId: string): Promise<string> {
  if (!isAiConfigured()) {
    throw new Error(
      "AI features require ANTHROPIC_API_KEY to be set in .env. Add your Anthropic API key and restart the dev server."
    );
  }

  const appointment = await db.appointment.findFirstOrThrow({
    where: { id: appointmentId, tenantId },
    include: {
      patient: { include: { user: true } },
      doctor: true,
    },
  });

  const [pastVisits, labOrders, prescriptions, kbDocs] = await Promise.all([
    db.visitRecord.findMany({
      where: { appointment: { patientId: appointment.patientId, tenantId } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    listLabOrders(tenantId, { patientId: appointment.patientId }),
    db.prescription.findMany({
      where: { patientId: appointment.patientId, tenantId, status: "PENDING" },
      include: { items: { include: { medicine: true } } },
    }),
    listKnowledgeBaseDocuments(tenantId),
  ]);

  return generateConsultSummary({
    patientName: appointment.patient.user.name,
    specialty: appointment.doctor.specialty,
    pastVisits: pastVisits.map((v) => ({
      date: v.createdAt.toLocaleDateString(),
      notes: v.notes,
      diagnosis: v.diagnosis ?? undefined,
    })),
    labResults: labOrders.flatMap((order) =>
      order.items.map((item) => ({
        testName: item.labTest.name,
        value: item.resultValue ?? undefined,
        unit: item.resultUnit ?? undefined,
        flag: item.flag ?? undefined,
      }))
    ),
    activePrescriptions: prescriptions.flatMap((rx) =>
      rx.items.map((item) => ({
        medicine: item.medicine.name,
        quantity: item.quantity,
        dosage: item.dosageInstructions ?? undefined,
      }))
    ),
    knowledgeBaseTitles: kbDocs.map((d) => d.title),
  });
}
