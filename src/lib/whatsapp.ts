import { db } from "@/lib/db";
import { getInvoiceWithBalance } from "@/lib/billing";
import { createAppointment } from "@/lib/appointments";
import { recordJourneyEvent } from "@/lib/journey";
import { MockWhatsAppProvider } from "@/lib/whatsapp/mockProvider";
import type { WhatsAppProvider } from "@/lib/whatsapp/provider";
import { withFreshDocumentToken } from "@/lib/documentUrlSigning";
import { decryptPHIMaybe } from "@/lib/phiCrypto";
import {
  generateAndAttachInvoiceDocument,
  generateAndAttachPrescriptionDocument,
  generateAndAttachConsultationSummaryDocument,
} from "@/lib/documents";

const provider: WhatsAppProvider = new MockWhatsAppProvider();

function nextBookableSlot() {
  const slot = new Date();
  slot.setDate(slot.getDate() + 1);
  slot.setHours(10, 0, 0, 0);
  return slot;
}

export async function handleInboundWebhook(params: {
  tenantId: string;
  fromPhone: string;
  rawPayload: unknown;
  messageText: string;
}) {
  const parsedIntent = params.messageText.toLowerCase().includes("book") ? "BOOK_APPOINTMENT" : "UNKNOWN";

  const message = await db.whatsAppMessage.create({
    data: {
      tenantId: params.tenantId,
      direction: "INBOUND",
      status: parsedIntent === "UNKNOWN" ? "RECEIVED" : "PARSED",
      fromPhone: params.fromPhone,
      rawPayload: params.rawPayload as object,
      parsedIntent,
    },
  });

  if (parsedIntent !== "BOOK_APPOINTMENT") return message;

  const patientUser = await db.user.findFirst({
    where: { tenantId: params.tenantId, phone: params.fromPhone, role: "PATIENT" },
    include: { patient: true },
  });
  if (!patientUser?.patient) {
    return db.whatsAppMessage.update({
      where: { id: message.id },
      data: { status: "FAILED", errorMessage: `No patient found with phone ${params.fromPhone} in this hospital` },
    });
  }

  const doctor = await db.doctor.findFirst({ where: { tenantId: params.tenantId } });
  if (!doctor) {
    return db.whatsAppMessage.update({
      where: { id: message.id },
      data: { status: "FAILED", errorMessage: "No doctors available in this hospital" },
    });
  }

  const appointment = await createAppointment({
    tenantId: params.tenantId,
    doctorId: doctor.id,
    patientId: patientUser.patient.id,
    datetime: nextBookableSlot(),
    source: "WHATSAPP",
  });

  await recordJourneyEvent({
    tenantId: params.tenantId,
    appointmentId: appointment.id,
    patientId: patientUser.patient.id,
    step: "APPOINTMENT_BOOKED",
  });

  return db.whatsAppMessage.update({
    where: { id: message.id },
    data: { status: "PROCESSED", relatedAppointmentId: appointment.id },
  });
}

export async function sendInvoiceViaWhatsApp(params: {
  tenantId: string;
  invoiceId: string;
  toPhone: string;
  baseUrl: string;
}) {
  const invoice = await getInvoiceWithBalance(params.invoiceId, params.tenantId);
  if (!invoice) throw new Error("Invoice not found");

  // A fresh PDF snapshot every send — an invoice's amountPaid/status can
  // change between sends, so each link should reflect the invoice as it
  // stood at the moment it was texted out, not live data that could drift.
  const document = await generateAndAttachInvoiceDocument(params.tenantId, params.invoiceId, params.baseUrl);
  const downloadUrl = withFreshDocumentToken(document.fileUrl, "invoice", document.id);
  const body = `Invoice ${invoice.invoiceNumber}\nBalance due: ${invoice.balanceDue}\nDownload: ${downloadUrl}`;

  const result = await provider.sendMessage(params.toPhone, body);

  return db.whatsAppMessage.create({
    data: {
      tenantId: params.tenantId,
      direction: "OUTBOUND",
      status: result.status === "SENT" ? "SENT" : result.status === "SIMULATED" ? "SIMULATED" : "FAILED",
      toPhone: params.toPhone,
      rawPayload: { body },
      relatedInvoiceId: params.invoiceId,
      errorMessage: result.errorMessage,
    },
  });
}

export async function sendPrescriptionViaWhatsApp(params: { tenantId: string; prescriptionId: string; baseUrl: string }) {
  const prescription = await db.prescription.findFirst({
    where: { id: params.prescriptionId, tenantId: params.tenantId },
    include: { patient: { include: { user: true } }, items: { include: { medicine: true } } },
  });
  if (!prescription) throw new Error("Prescription not found");

  const toPhone = prescription.patient.user.phone;
  if (!toPhone) {
    return db.whatsAppMessage.create({
      data: {
        tenantId: params.tenantId,
        direction: "OUTBOUND",
        status: "FAILED",
        rawPayload: {},
        relatedPrescriptionId: params.prescriptionId,
        errorMessage: `Patient ${prescription.patient.user.name} has no phone on file`,
      },
    });
  }

  const document = await generateAndAttachPrescriptionDocument(params.tenantId, params.prescriptionId, params.baseUrl);
  const downloadUrl = withFreshDocumentToken(document.fileUrl, "prescription", document.id);
  const body = `Dr. has prescribed medicines for ${prescription.patient.user.name}.\nDownload: ${downloadUrl}\n\nPlease show this at the pharmacy to collect your medicines.`;

  const result = await provider.sendMessage(toPhone, body);

  return db.whatsAppMessage.create({
    data: {
      tenantId: params.tenantId,
      direction: "OUTBOUND",
      status: result.status === "SENT" ? "SENT" : result.status === "SIMULATED" ? "SIMULATED" : "FAILED",
      toPhone,
      rawPayload: { body },
      relatedPrescriptionId: params.prescriptionId,
      errorMessage: result.errorMessage,
    },
  });
}

export async function sendLabReportViaWhatsApp(params: {
  tenantId: string;
  labReportId: string;
  toPhone: string;
}) {
  const report = await db.labReport.findFirst({
    where: { id: params.labReportId, labOrder: { tenantId: params.tenantId } },
    include: { labOrder: { include: { patient: { include: { user: true } }, items: { include: { labTest: true } } } } },
  });
  if (!report) throw new Error("Lab report not found");

  const testNames = report.labOrder.items.map((i) => i.labTest.name).join(", ");
  const reportUrl = withFreshDocumentToken(report.fileUrl, "lab_report", report.id);
  const body = `Lab report for ${report.labOrder.patient.user.name}\nTests: ${testNames}\nView report: ${reportUrl}`;

  const result = await provider.sendMessage(params.toPhone, body);

  return db.whatsAppMessage.create({
    data: {
      tenantId: params.tenantId,
      direction: "OUTBOUND",
      status: result.status === "SENT" ? "SENT" : result.status === "SIMULATED" ? "SIMULATED" : "FAILED",
      toPhone: params.toPhone,
      rawPayload: { body },
      relatedLabReportId: params.labReportId,
      errorMessage: result.errorMessage,
    },
  });
}

// VisitRecord.notes is the doctor's own working notes — never patient-
// facing. diagnosis and prescription (the "treatment plan" field, despite
// the column name — distinct from the structured Prescription/pharmacy
// model sendPrescriptionViaWhatsApp sends) are what a patient should
// actually see, and only appear in the generated PDF, not the WhatsApp
// text itself — same minimal "context line + download link" shape as the
// other three document sends. Returns null rather than sending an empty
// message when a visit was completed with neither field filled in.
export async function sendConsultationSummaryViaWhatsApp(params: {
  tenantId: string;
  appointmentId: string;
  baseUrl: string;
}) {
  const visitRecord = await db.visitRecord.findFirst({
    where: { appointmentId: params.appointmentId, appointment: { tenantId: params.tenantId } },
    include: {
      appointment: {
        include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
      },
    },
  });
  if (!visitRecord) throw new Error("Visit record not found");

  const diagnosis = decryptPHIMaybe(visitRecord.diagnosis);
  const treatmentPlan = decryptPHIMaybe(visitRecord.prescription);
  if (!diagnosis && !treatmentPlan) return null;

  const { patient, doctor, datetime } = visitRecord.appointment;
  const toPhone = patient.user.phone;

  if (!toPhone) {
    return db.whatsAppMessage.create({
      data: {
        tenantId: params.tenantId,
        direction: "OUTBOUND",
        status: "FAILED",
        rawPayload: {},
        relatedVisitRecordId: visitRecord.id,
        errorMessage: `Patient ${patient.user.name} has no phone on file`,
      },
    });
  }

  const document = await generateAndAttachConsultationSummaryDocument(
    params.tenantId,
    params.appointmentId,
    params.baseUrl
  );
  const downloadUrl = withFreshDocumentToken(document.fileUrl, "consultation_summary", document.id);
  const body = `Consultation summary for ${patient.user.name}\nSeen by Dr. ${doctor.user.name} on ${datetime.toLocaleDateString()}\nDownload: ${downloadUrl}`;

  const result = await provider.sendMessage(toPhone, body);

  return db.whatsAppMessage.create({
    data: {
      tenantId: params.tenantId,
      direction: "OUTBOUND",
      status: result.status === "SENT" ? "SENT" : result.status === "SIMULATED" ? "SIMULATED" : "FAILED",
      toPhone,
      rawPayload: { body },
      relatedVisitRecordId: visitRecord.id,
      errorMessage: result.errorMessage,
    },
  });
}
