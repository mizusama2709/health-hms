import { db } from "@/lib/db";
import { getInvoiceWithBalance } from "@/lib/billing";
import { createAppointment } from "@/lib/appointments";
import { recordJourneyEvent } from "@/lib/journey";
import { MockWhatsAppProvider } from "@/lib/whatsapp/mockProvider";
import { MetaWhatsAppProvider } from "@/lib/whatsapp/metaProvider";
import type { WhatsAppProvider } from "@/lib/whatsapp/provider";
import { withFreshDocumentToken } from "@/lib/documentUrlSigning";
import { decryptPHIMaybe } from "@/lib/phiCrypto";
import {
  generateAndAttachInvoiceDocument,
  generateAndAttachPrescriptionDocument,
  generateAndAttachConsultationSummaryDocument,
} from "@/lib/documents";
import { notify } from "@/lib/notifications";
import type { WhatsAppMessageStatus } from "@prisma/client";

// Defaults closed to the mock — WHATSAPP_PROVIDER must be explicitly set to
// "meta", and both Meta credentials must be present, before this will ever
// place a real call or send a real message to a real phone number. A
// half-configured environment (e.g. WHATSAPP_PROVIDER=meta but a missing
// token, perhaps from a copy-pasted .env that dropped a line) falls back to
// mock rather than throwing or silently no-op'ing — safe by default, never
// a surprise send. Not cached: cheap to construct, re-reads env on every
// call, and stays testable (a cached singleton would freeze whichever
// provider won the first call for the rest of the process).
export function getWhatsAppProvider(): WhatsAppProvider {
  if (process.env.WHATSAPP_PROVIDER === "meta") {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (accessToken && phoneNumberId) {
      return new MetaWhatsAppProvider(accessToken, phoneNumberId);
    }
    console.warn(
      "WHATSAPP_PROVIDER=meta but WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID are not both set — falling back to the mock provider."
    );
  }

  return new MockWhatsAppProvider();
}

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

  const result = await getWhatsAppProvider().sendMessage(params.toPhone, body);

  return db.whatsAppMessage.create({
    data: {
      tenantId: params.tenantId,
      direction: "OUTBOUND",
      status: result.status === "SENT" ? "SENT" : result.status === "SIMULATED" ? "SIMULATED" : "FAILED",
      toPhone: params.toPhone,
      rawPayload: { body },
      relatedInvoiceId: params.invoiceId,
      providerMessageId: result.providerMessageId,
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

  const result = await getWhatsAppProvider().sendMessage(toPhone, body);

  return db.whatsAppMessage.create({
    data: {
      tenantId: params.tenantId,
      direction: "OUTBOUND",
      status: result.status === "SENT" ? "SENT" : result.status === "SIMULATED" ? "SIMULATED" : "FAILED",
      toPhone,
      rawPayload: { body },
      relatedPrescriptionId: params.prescriptionId,
      providerMessageId: result.providerMessageId,
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

  const result = await getWhatsAppProvider().sendMessage(params.toPhone, body);

  return db.whatsAppMessage.create({
    data: {
      tenantId: params.tenantId,
      direction: "OUTBOUND",
      status: result.status === "SENT" ? "SENT" : result.status === "SIMULATED" ? "SIMULATED" : "FAILED",
      toPhone: params.toPhone,
      rawPayload: { body },
      relatedLabReportId: params.labReportId,
      providerMessageId: result.providerMessageId,
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

  const result = await getWhatsAppProvider().sendMessage(toPhone, body);

  return db.whatsAppMessage.create({
    data: {
      tenantId: params.tenantId,
      direction: "OUTBOUND",
      status: result.status === "SENT" ? "SENT" : result.status === "SIMULATED" ? "SIMULATED" : "FAILED",
      toPhone,
      rawPayload: { body },
      relatedVisitRecordId: visitRecord.id,
      providerMessageId: result.providerMessageId,
      errorMessage: result.errorMessage,
    },
  });
}

const META_STATUS_MAP: Partial<Record<string, WhatsAppMessageStatus>> = {
  sent: "SENT",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
};

// Meta's delivery-status webhook shape: entry[].changes[].value.statuses[],
// each an { id: "wamid...", status: "sent"|"delivered"|"read"|"failed" }.
// Defensively navigated since a malformed/unexpected payload should be
// skipped, not crash the webhook route.
function parseMetaStatusWebhook(payload: unknown): { providerMessageId: string; status: string }[] {
  const entries = (payload as { entry?: unknown[] })?.entry ?? [];
  const updates: { providerMessageId: string; status: string }[] = [];
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes ?? [];
    for (const change of changes) {
      const statuses = (change as { value?: { statuses?: unknown[] } })?.value?.statuses ?? [];
      for (const s of statuses) {
        const id = (s as { id?: string })?.id;
        const status = (s as { status?: string })?.status;
        if (id && status) updates.push({ providerMessageId: id, status });
      }
    }
  }
  return updates;
}

// Only meaningful once the real Meta provider is in use — the mock never
// produces a providerMessageId a real webhook could reference, so this is
// a no-op (0 matches) against mock-sent messages, which is correct.
export async function handleStatusWebhook(payload: unknown) {
  const updates = parseMetaStatusWebhook(payload);
  const applied: { id: string; status: WhatsAppMessageStatus }[] = [];

  for (const update of updates) {
    const mapped = META_STATUS_MAP[update.status];
    if (!mapped) continue;

    const message = await db.whatsAppMessage.findUnique({ where: { providerMessageId: update.providerMessageId } });
    if (!message) continue;

    await db.whatsAppMessage.update({ where: { id: message.id }, data: { status: mapped } });
    applied.push({ id: message.id, status: mapped });

    if (mapped === "FAILED") {
      await notify({
        tenantId: message.tenantId,
        type: "WHATSAPP_DELIVERY_FAILED",
        title: "WhatsApp message failed to deliver",
        body: message.toPhone ? `Delivery to ${message.toPhone} failed.` : "A message failed to deliver.",
        href: "/admin/inbox",
      });
    }
  }

  return applied;
}
