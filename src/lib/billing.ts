import { db } from "@/lib/db";
import { ServiceType, PaymentMode, AppointmentSource } from "@prisma/client";

function generateInvoiceNumber() {
  return `INV-${Date.now().toString(36).toUpperCase()}`;
}

export async function createInvoice(params: {
  tenantId: string;
  patientId: string;
  appointmentId?: string;
  serviceType: ServiceType;
  source?: AppointmentSource;
  lineItems: { description: string; serviceType: ServiceType; quantity: number; unitPrice: number }[];
  discountAmount?: number;
}) {
  const subtotal = params.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const discountAmount = params.discountAmount ?? 0;
  const totalAmount = subtotal - discountAmount;

  return db.invoice.create({
    data: {
      tenantId: params.tenantId,
      patientId: params.patientId,
      appointmentId: params.appointmentId,
      invoiceNumber: generateInvoiceNumber(),
      serviceType: params.serviceType,
      source: params.source ?? "MANUAL",
      subtotal,
      discountAmount,
      totalAmount,
      lineItems: {
        create: params.lineItems.map((li) => ({
          description: li.description,
          serviceType: li.serviceType,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          lineTotal: li.quantity * li.unitPrice,
        })),
      },
    },
    include: { lineItems: true },
  });
}

export async function recordPayment(params: {
  tenantId: string;
  invoiceId: string;
  amount: number;
  mode: PaymentMode;
  reference?: string;
}) {
  const invoice = await db.invoice.findFirstOrThrow({
    where: { id: params.invoiceId, tenantId: params.tenantId },
  });

  const payment = await db.payment.create({
    data: {
      tenantId: params.tenantId,
      invoiceId: params.invoiceId,
      amount: params.amount,
      mode: params.mode,
      reference: params.reference,
    },
  });

  const amountPaid = Number(invoice.amountPaid) + params.amount;
  const status =
    amountPaid >= Number(invoice.totalAmount)
      ? "PAID"
      : amountPaid > 0
      ? "PARTIALLY_PAID"
      : "UNPAID";

  await db.invoice.update({
    where: { id: params.invoiceId },
    data: { amountPaid, status },
  });

  return payment;
}

export async function getInvoiceWithBalance(invoiceId: string, tenantId: string) {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: { lineItems: true, payments: true, refunds: true },
  });
  if (!invoice) return null;

  const balanceDue = Number(invoice.totalAmount) - Number(invoice.amountPaid);
  return { ...invoice, balanceDue };
}
