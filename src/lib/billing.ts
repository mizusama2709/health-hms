import { db } from "@/lib/db";
import { ServiceType, PaymentMode, AppointmentSource, InvoiceStatus } from "@prisma/client";

async function generateInvoiceNumber(tenantId: string) {
  const counter = await db.invoiceCounter.upsert({
    where: { tenantId },
    create: { tenantId, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `INV-${String(counter.value).padStart(6, "0")}`;
}

export async function createInvoice(params: {
  tenantId: string;
  patientId: string;
  appointmentId?: string;
  serviceType: ServiceType;
  source?: AppointmentSource;
  lineItems: {
    description: string;
    serviceType: ServiceType;
    quantity: number;
    unitPrice: number;
    serviceId?: string;
    taxRatePercent?: number;
  }[];
  discountAmount?: number;
}) {
  const serviceIds = params.lineItems.map((li) => li.serviceId).filter((id): id is string => !!id);
  const services = serviceIds.length
    ? await db.service.findMany({ where: { id: { in: serviceIds }, tenantId: params.tenantId } })
    : [];
  const taxRateByServiceId = new Map(services.map((s) => [s.id, Number(s.taxRatePercent)]));

  const lines = params.lineItems.map((li) => {
    const taxRatePercent = li.taxRatePercent ?? (li.serviceId ? taxRateByServiceId.get(li.serviceId) ?? 0 : 0);
    const lineTotal = li.quantity * li.unitPrice;
    const gst = (lineTotal * taxRatePercent) / 100;
    return { ...li, taxRatePercent, lineTotal, cgst: gst / 2, sgst: gst / 2 };
  });

  const subtotal = lines.reduce((sum, li) => sum + li.lineTotal, 0);
  const cgstAmount = lines.reduce((sum, li) => sum + li.cgst, 0);
  const sgstAmount = lines.reduce((sum, li) => sum + li.sgst, 0);
  const discountAmount = params.discountAmount ?? 0;
  const totalAmount = subtotal - discountAmount + cgstAmount + sgstAmount;

  return db.invoice.create({
    data: {
      tenantId: params.tenantId,
      patientId: params.patientId,
      appointmentId: params.appointmentId,
      invoiceNumber: await generateInvoiceNumber(params.tenantId),
      serviceType: params.serviceType,
      source: params.source ?? "MANUAL",
      subtotal,
      discountAmount,
      cgstAmount,
      sgstAmount,
      totalAmount,
      lineItems: {
        create: lines.map((li) => ({
          description: li.description,
          serviceType: li.serviceType,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          taxRatePercent: li.taxRatePercent,
          lineTotal: li.lineTotal,
          serviceId: li.serviceId,
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
  return db.$transaction(async (tx) => {
    // Row lock via FOR UPDATE — two concurrent payments on the same invoice
    // must not both read the same amountPaid and overwrite each other's update.
    const [invoice] = await tx.$queryRaw<{ amountPaid: unknown; totalAmount: unknown }[]>`
      SELECT "amountPaid", "totalAmount" FROM "Invoice"
      WHERE id = ${params.invoiceId} AND "tenantId" = ${params.tenantId}
      FOR UPDATE
    `;
    if (!invoice) throw new Error("Invoice not found");

    const payment = await tx.payment.create({
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

    await tx.invoice.update({
      where: { id: params.invoiceId },
      data: { amountPaid, status },
    });

    return payment;
  });
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
    // Row lock via FOR UPDATE — same lost-update hazard as recordPayment if a
    // refund and a payment (or two refunds) land on this invoice concurrently.
    const [invoice] = await tx.$queryRaw<{ amountPaid: unknown; totalAmount: unknown }[]>`
      SELECT "amountPaid", "totalAmount" FROM "Invoice"
      WHERE id = ${params.invoiceId} AND "tenantId" = ${params.tenantId}
      FOR UPDATE
    `;
    if (!invoice) throw new Error("Invoice not found");

    if (!Number.isFinite(params.amount) || params.amount <= 0 || params.amount > Number(invoice.amountPaid)) {
      throw new Error(`Refund amount can't exceed the amount paid (${Number(invoice.amountPaid).toFixed(2)})`);
    }

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

export type LedgerSource = "CONSULTATION" | "PHARMACY" | "LAB" | "MANUAL";

// An invoice not linked to any appointment is treated as "Manual" billing.
export async function getConsolidatedLedger(
  tenantId: string,
  filters: { from?: Date; to?: Date; source?: LedgerSource }
) {
  const invoices = await db.invoice.findMany({
    where: {
      tenantId,
      status: { not: "VOID" },
      ...(filters.from || filters.to ? { createdAt: { gte: filters.from, lte: filters.to } } : {}),
      ...(filters.source === "MANUAL" && { appointmentId: null }),
      ...(filters.source && filters.source !== "MANUAL" && { serviceType: filters.source, appointmentId: { not: null } }),
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = invoices.map((inv) => ({
    id: inv.id,
    date: inv.createdAt,
    source: (inv.appointmentId ? inv.serviceType : "MANUAL") as LedgerSource,
    invoiceNumber: inv.invoiceNumber,
    taxable: Number(inv.subtotal),
    cgst: Number(inv.cgstAmount),
    sgst: Number(inv.sgstAmount),
    total: Number(inv.totalAmount),
  }));

  const totals = rows.reduce(
    (acc, r) => {
      acc.taxable += r.taxable;
      acc.cgst += r.cgst;
      acc.sgst += r.sgst;
      acc.total += r.total;
      return acc;
    },
    { taxable: 0, cgst: 0, sgst: 0, total: 0 }
  );

  const bySource = (["CONSULTATION", "PHARMACY", "LAB", "MANUAL"] as LedgerSource[]).reduce(
    (acc, type) => {
      const matching = rows.filter((r) => r.source === type);
      acc[type] = { total: matching.reduce((s, r) => s + r.total, 0), count: matching.length };
      return acc;
    },
    {} as Record<LedgerSource, { total: number; count: number }>
  );

  return {
    rows,
    totals: { ...totals, invoiceCount: rows.length },
    bySource,
  };
}

export type InvoiceQuickFilter =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CONSULTATION"
  | "PHARMACY"
  | "LAB"
  | "MANUAL";

export async function listInvoicesDetailed(
  tenantId: string,
  filters?: { search?: string; from?: Date; to?: Date; filter?: InvoiceQuickFilter }
) {
  const statusFilters = new Set(["UNPAID", "PARTIALLY_PAID", "PAID"]);
  const serviceTypeFilters = new Set(["CONSULTATION", "PHARMACY", "LAB"]);

  return db.invoice.findMany({
    where: {
      tenantId,
      ...(filters?.from || filters?.to ? { createdAt: { gte: filters?.from, lte: filters?.to } } : {}),
      ...(filters?.filter && statusFilters.has(filters.filter) && { status: filters.filter as InvoiceStatus }),
      ...(filters?.filter &&
        serviceTypeFilters.has(filters.filter) && { serviceType: filters.filter as ServiceType }),
      ...(filters?.filter === "MANUAL" && { source: "MANUAL" as AppointmentSource }),
      ...(filters?.search && {
        patient: {
          user: {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { phone: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        },
      }),
    },
    include: {
      patient: { include: { user: true } },
      appointment: { include: { doctor: { include: { user: true } } } },
      lineItems: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateInvoiceLineItem(
  tenantId: string,
  invoiceId: string,
  description: string,
  unitPrice: number
) {
  return db.$transaction(async (tx) => {
    // Row lock — two concurrent edits to the same invoice's line item must
    // not both read the same discountAmount/lineItems and overwrite each
    // other's recomputed subtotal/GST/total.
    await tx.$queryRaw`
      SELECT id FROM "Invoice" WHERE id = ${invoiceId} AND "tenantId" = ${tenantId} FOR UPDATE
    `;

    const invoice = await tx.invoice.findFirstOrThrow({
      where: { id: invoiceId, tenantId },
      include: { lineItems: true },
    });
    const firstLine = invoice.lineItems[0];
    if (!firstLine) throw new Error("Invoice has no line items to edit");

    const lineTotal = firstLine.quantity * unitPrice;
    const otherLines = invoice.lineItems.slice(1);
    const subtotal = lineTotal + otherLines.reduce((sum, li) => sum + Number(li.lineTotal), 0);

    const gstFor = (amount: number, ratePercent: number) => (amount * ratePercent) / 100;
    const totalGst =
      gstFor(lineTotal, Number(firstLine.taxRatePercent)) +
      otherLines.reduce((sum, li) => sum + gstFor(Number(li.lineTotal), Number(li.taxRatePercent)), 0);
    const cgstAmount = totalGst / 2;
    const sgstAmount = totalGst / 2;
    const totalAmount = subtotal - Number(invoice.discountAmount) + cgstAmount + sgstAmount;

    await tx.invoiceLineItem.update({
      where: { id: firstLine.id },
      data: { description, unitPrice, lineTotal },
    });
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { subtotal, cgstAmount, sgstAmount, totalAmount },
    });
  });
}

export async function markInvoicePaidInFull(tenantId: string, invoiceId: string, mode: PaymentMode = "CASH") {
  // Computes balanceDue and pays it inside a single locked transaction rather
  // than delegating to recordPayment with a pre-computed amount — otherwise
  // two concurrent calls (e.g. a double-click) would both read the same
  // stale balance and each pay it in full, overpaying the invoice.
  return db.$transaction(async (tx) => {
    const [invoice] = await tx.$queryRaw<{ amountPaid: unknown; totalAmount: unknown }[]>`
      SELECT "amountPaid", "totalAmount" FROM "Invoice"
      WHERE id = ${invoiceId} AND "tenantId" = ${tenantId}
      FOR UPDATE
    `;
    if (!invoice) throw new Error("Invoice not found");

    const balanceDue = Number(invoice.totalAmount) - Number(invoice.amountPaid);
    if (balanceDue <= 0) return null;

    const payment = await tx.payment.create({
      data: { tenantId, invoiceId, amount: balanceDue, mode },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: Number(invoice.amountPaid) + balanceDue, status: "PAID" },
    });

    return payment;
  });
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
