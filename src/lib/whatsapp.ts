import { db } from "@/lib/db";
import { getInvoiceWithBalance } from "@/lib/billing";
import { createAppointment } from "@/lib/appointments";
import { recordJourneyEvent } from "@/lib/journey";
import { MockWhatsAppProvider } from "@/lib/whatsapp/mockProvider";
import type { WhatsAppProvider } from "@/lib/whatsapp/provider";

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
