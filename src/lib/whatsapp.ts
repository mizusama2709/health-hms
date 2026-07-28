import { db } from "@/lib/db";
import { getInvoiceWithBalance } from "@/lib/billing";
import { MockWhatsAppProvider } from "@/lib/whatsapp/mockProvider";
import type { WhatsAppProvider } from "@/lib/whatsapp/provider";

const provider: WhatsAppProvider = new MockWhatsAppProvider();

export async function handleInboundWebhook(params: {
  tenantId: string;
  fromPhone: string;
  rawPayload: unknown;
  messageText: string;
}) {
  const parsedIntent = params.messageText.toLowerCase().includes("book") ? "BOOK_APPOINTMENT" : "UNKNOWN";

  return db.whatsAppMessage.create({
    data: {
      tenantId: params.tenantId,
      direction: "INBOUND",
      status: parsedIntent === "UNKNOWN" ? "RECEIVED" : "PARSED",
      fromPhone: params.fromPhone,
      rawPayload: params.rawPayload as object,
      parsedIntent,
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
