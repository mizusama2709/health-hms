import { db } from "@/lib/db";
import { ServiceType, PaymentMode, AppointmentSource, InvoiceStatus } from "@prisma/client";

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

export async function issueRefund(params: {
  tenantId: string;
  invoiceId: string;
  paymentId?: string;
  amount: number;
  reason?: string;
}) {
  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirstOrThrow({
      where: { id: params.invoiceId, tenantId: params.tenantId },
    });

    const refund = await tx.refund.create({
      data: {
        tenantId: params.tenantId,
        invoiceId: params.invoiceId,
        paymentId: params.paymentId,
        amount: params.amount,
        reason: params.reason,
      },
    });

    if (params.paymentId) {
      const payment = await tx.payment.findFirstOrThrow({
        where: { id: params.paymentId, tenantId: params.tenantId },
      });
      const refundedForPayment = await tx.refund.aggregate({
        where: { paymentId: params.paymentId },
        _sum: { amount: true },
      });
      const totalRefunded = Number(refundedForPayment._sum.amount ?? 0);
      await tx.payment.update({
        where: { id: params.paymentId },
        data: {
          status: totalRefunded >= Number(payment.amount) ? "REFUNDED" : "PARTIALLY_REFUNDED",
        },
      });
    }

    const amountPaid = Math.max(0, Number(invoice.amountPaid) - params.amount);
    const status =
      amountPaid <= 0 ? "UNPAID" : amountPaid >= Number(invoice.totalAmount) ? "PAID" : "PARTIALLY_PAID";

    await tx.invoice.update({
      where: { id: params.invoiceId },
      data: { amountPaid, status },
    });

    return refund;
  });
}

export async function listInvoices(
  tenantId: string,
  filters?: { status?: InvoiceStatus; serviceType?: ServiceType; from?: Date; to?: Date }
) {
  return db.invoice.findMany({
    where: {
      tenantId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.serviceType && { serviceType: filters.serviceType }),
      ...(filters?.from || filters?.to
        ? { createdAt: { gte: filters?.from, lte: filters?.to } }
        : {}),
    },
    include: {
      patient: { include: { user: true } },
      appointment: true,
      lineItems: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getConsolidatedLedger(
  tenantId: string,
  filters: { from?: Date; to?: Date; source?: AppointmentSource; serviceType?: ServiceType }
) {
  const invoiceWhere = {
    tenantId,
    ...(filters.source && { source: filters.source }),
    ...(filters.serviceType && { serviceType: filters.serviceType }),
  };

  const [payments, refunds] = await Promise.all([
    db.payment.findMany({
      where: {
        tenantId,
        ...(filters.from || filters.to ? { paidAt: { gte: filters.from, lte: filters.to } } : {}),
        invoice: invoiceWhere,
      },
      include: { invoice: { include: { patient: { include: { user: true } } } } },
    }),
    db.refund.findMany({
      where: {
        tenantId,
        ...(filters.from || filters.to
          ? { refundedAt: { gte: filters.from, lte: filters.to } }
          : {}),
        invoice: invoiceWhere,
      },
      include: { invoice: { include: { patient: { include: { user: true } } } } },
    }),
  ]);

  const entries = [
    ...payments.map((p) => ({
      kind: "PAYMENT" as const,
      id: p.id,
      timestamp: p.paidAt,
      amount: Number(p.amount),
      invoice: p.invoice,
    })),
    ...refunds.map((r) => ({
      kind: "REFUND" as const,
      id: r.id,
      timestamp: r.refundedAt,
      amount: Number(r.amount),
      invoice: r.invoice,
    })),
  ];

  entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return entries;
}

export async function voidInvoice(tenantId: string, invoiceId: string) {
  const invoice = await db.invoice.findFirstOrThrow({
    where: { id: invoiceId, tenantId },
  });
  if (Number(invoice.amountPaid) > 0) {
    throw new Error("Cannot void an invoice that has payments recorded — issue a refund instead.");
  }
  return db.invoice.update({
    where: { id: invoiceId },
    data: { status: "VOID" },
  });
}
