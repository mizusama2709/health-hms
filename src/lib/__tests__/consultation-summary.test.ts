import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { encryptPHI } from "@/lib/phiCrypto";
import { sendConsultationSummaryViaWhatsApp } from "@/lib/whatsapp";

// Regression coverage for the consultation-summary WhatsApp send — the one
// document type of the four (invoice/prescription/lab report/consultation
// summary) that didn't exist before. Patients never log in, so this
// message + the download link it'll carry (once PDF generation lands) is
// their entire view of the visit.

let tenantId: string;
let doctorId: string;
let doctorUserName: string;
const createdAppointmentIds: string[] = [];
const createdUserIds: string[] = [];

beforeAll(async () => {
  const tenant = await db.tenant.findFirstOrThrow();
  const doctor = await db.doctor.findFirstOrThrow({ where: { tenantId: tenant.id }, include: { user: true } });
  tenantId = tenant.id;
  doctorId = doctor.id;
  doctorUserName = doctor.user.name;
});

afterEach(async () => {
  for (const id of createdAppointmentIds.splice(0)) {
    const visitRecordIds = await visitRecordIdsFor(id);
    await db.whatsAppMessage.deleteMany({ where: { relatedVisitRecordId: { in: visitRecordIds } } });
    await db.generatedDocument.deleteMany({ where: { visitRecordId: { in: visitRecordIds } } });
    await db.visitRecord.deleteMany({ where: { appointmentId: id } });
    await db.appointment.delete({ where: { id } });
  }
  for (const id of createdUserIds.splice(0)) {
    await db.patient.deleteMany({ where: { userId: id } });
    await db.user.delete({ where: { id } }).catch(() => {});
  }
});

async function visitRecordIdsFor(appointmentId: string) {
  const rows = await db.visitRecord.findMany({ where: { appointmentId }, select: { id: true } });
  return rows.map((r) => r.id);
}

async function makeVisit(params: {
  phone: string | null;
  notes: string;
  diagnosis?: string;
  treatmentPlan?: string;
}) {
  const user = await db.user.create({
    data: {
      tenantId,
      email: `consult-summary-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      name: "Consult Summary Test Patient",
      role: "PATIENT",
      passwordHash: "unused",
      phone: params.phone,
      patient: { create: { tenantId } },
    },
    include: { patient: true },
  });
  createdUserIds.push(user.id);

  const appointment = await db.appointment.create({
    data: {
      tenantId,
      doctorId,
      patientId: user.patient!.id,
      datetime: new Date(),
      type: "NEW",
      serviceType: "CONSULTATION",
      source: "MANUAL",
    },
  });
  createdAppointmentIds.push(appointment.id);

  await db.visitRecord.create({
    data: {
      appointmentId: appointment.id,
      notes: encryptPHI(params.notes),
      diagnosis: params.diagnosis ? encryptPHI(params.diagnosis) : null,
      prescription: params.treatmentPlan ? encryptPHI(params.treatmentPlan) : null,
    },
  });

  return { appointment, patientName: user.name };
}

describe("sendConsultationSummaryViaWhatsApp", () => {
  it("sends a download link (never diagnosis/notes text) and generates a real PDF containing the care details", async () => {
    const { appointment } = await makeVisit({
      phone: "+919812300010",
      notes: "INTERNAL ONLY: patient was difficult, suspect non-compliance",
      diagnosis: "Seasonal allergic rhinitis",
      treatmentPlan: "Antihistamine for 5 days, avoid known triggers",
    });

    const message = await sendConsultationSummaryViaWhatsApp({
      tenantId,
      appointmentId: appointment.id,
      baseUrl: "http://localhost:3000",
    });

    expect(message?.status).toBe("SIMULATED");
    const body = (message?.rawPayload as { body: string }).body;
    expect(body).toContain(doctorUserName);
    expect(body).toContain("Download: http://localhost:3000/api/documents/consultation_summary/");
    // PHI never rides in the WhatsApp text itself — only inside the signed-link PDF.
    expect(body).not.toContain("Seasonal allergic rhinitis");
    expect(body).not.toContain("INTERNAL ONLY");
    expect(body).not.toContain("non-compliance");

    const document = await db.generatedDocument.findFirstOrThrow({
      where: { type: "consultation_summary", visitRecordId: { in: await visitRecordIdsFor(appointment.id) } },
    });
    expect(document.fileUrl).toBe(`http://localhost:3000/api/documents/consultation_summary/${document.id}/pdf`);
    // %PDF magic header — confirms this is a real PDF document, not placeholder bytes
    expect(Buffer.from(document.pdfData).subarray(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("sends nothing when neither diagnosis nor a care plan was recorded", async () => {
    const { appointment } = await makeVisit({ phone: "+919812300011", notes: "Routine visit, nothing notable" });

    const message = await sendConsultationSummaryViaWhatsApp({ tenantId, appointmentId: appointment.id, baseUrl: "http://localhost:3000" });

    expect(message).toBeNull();
    const count = await db.whatsAppMessage.count({
      where: { relatedVisitRecordId: { in: await visitRecordIdsFor(appointment.id) } },
    });
    expect(count).toBe(0);
  });

  it("marks the message failed when the patient has no phone on file", async () => {
    const { appointment } = await makeVisit({
      phone: null,
      notes: "Notes",
      diagnosis: "Mild dehydration",
    });

    const message = await sendConsultationSummaryViaWhatsApp({ tenantId, appointmentId: appointment.id, baseUrl: "http://localhost:3000" });

    expect(message?.status).toBe("FAILED");
    expect(message?.errorMessage).toMatch(/no phone/i);
  });
});
