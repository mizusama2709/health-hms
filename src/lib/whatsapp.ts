import { db } from "@/lib/db";
import { getInvoiceWithBalance } from "@/lib/billing";
import { createAppointment } from "@/lib/appointments";
import { recordJourneyEvent } from "@/lib/journey";
import { MockWhatsAppProvider } from "@/lib/whatsapp/mockProvider";
import { MetaCloudWhatsAppProvider } from "@/lib/whatsapp/metaCloudProvider";
import type { WhatsAppProvider } from "@/lib/whatsapp/provider";
import { withFreshLabReportToken } from "@/lib/labReportUrlSigning";
import { generateAIReply } from "@/lib/openrouter";

const provider: WhatsAppProvider =
  process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
    ? new MetaCloudWhatsAppProvider()
    : new MockWhatsAppProvider();

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

  if (parsedIntent !== "BOOK_APPOINTMENT") {
    await replyWithAI(params.tenantId, params.fromPhone, params.messageText);
    return message;
  }

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

// AI triage for anything that isn't a recognized hard-coded intent. Q&A only —
// it never books, cancels, or writes to a record; that stays on the keyword path above.
async function replyWithAI(tenantId: string, fromPhone: string, messageText: string) {
  const patientUser = await db.user.findFirst({
    where: { tenantId, phone: fromPhone, role: "PATIENT" },
    include: {
      patient: {
        include: {
          appointments: { where: { datetime: { gte: new Date() } }, orderBy: { datetime: "asc" }, take: 1 },
        },
      },
    },
  });

  const upcoming = patientUser?.patient?.appointments[0];
  const replyText = await generateAIReply({
    patientMessage: messageText,
    patientName: patientUser?.name,
    upcomingAppointment: upcoming ? upcoming.datetime.toLocaleString() : null,
  });
  if (!replyText) return; // no API key configured yet, or the call failed — stay silent rather than send a broken reply

  const result = await provider.sendMessage(fromPhone, replyText);
  await db.whatsAppMessage.create({
    data: {
      tenantId,
      direction: "OUTBOUND",
      status: result.status === "SENT" ? "SENT" : result.status === "SIMULATED" ? "SIMULATED" : "FAILED",
      toPhone: fromPhone,
      rawPayload: { body: replyText },
      errorMessage: result.errorMessage,
    },
  });
}

export async function sendInvoiceViaWhatsApp(params: {
  tenantId: string;
  invoiceId: string;
  toPhone: string;
}) {
  const invoice = await getInvoiceWithBalance(params.invoiceId, params.tenantId);
  if (!invoice) throw new Error("Invoice not found");

  const body = `Invoice ${invoice.invoiceNumber}\nTotal: ${invoice.totalAmount}\nPaid: ${invoice.amountPaid}\nBalance due: ${invoice.balanceDue}`;

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

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export async function sendPrescriptionViaWhatsApp(params: { tenantId: string; prescriptionId: string }) {
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

  const lines = prescription.items.map((item) => {
    const doseTimes = item.doseTimes.map(titleCase).join(", ") || "as needed";
    const duration =
      item.durationValue && item.durationUnit ? ` for ${item.durationValue} ${titleCase(item.durationUnit)}` : "";
    const note = item.dosageInstructions ? ` (${item.dosageInstructions})` : "";
    return `${item.medicine.name} x${item.quantity} — ${doseTimes}${duration}${note}`;
  });
  const body = `Dr. has prescribed the following for ${prescription.patient.user.name}:\n${lines.join("\n")}\n\nPlease show this message at the pharmacy to collect your medicines.`;

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
  const reportUrl = withFreshLabReportToken(report.fileUrl, report.id);
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
