"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import {
  createInvoice,
  recordPayment,
  issueRefund,
  voidInvoice,
  markInvoicePaidInFull,
  updateInvoiceLineItem,
} from "@/lib/billing";
import type { PaymentMode, ServiceType } from "@prisma/client";

const BILLING_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN", "RECEPTIONIST"] as const;

export async function billPatient(formData: FormData) {
  await requireRole(...BILLING_ROLES);
  const tenantId = await requireTenantId();

  const patientId = formData.get("patientId") as string;
  const serviceType = formData.get("serviceType") as ServiceType;
  const description = formData.get("description") as string;
  const unitPrice = Number(formData.get("unitPrice"));
  const quantity = Number(formData.get("quantity") || 1);
  const serviceId = (formData.get("serviceId") as string) || undefined;

  await createInvoice({
    tenantId,
    patientId,
    serviceType,
    lineItems: [{ description, serviceType, quantity, unitPrice, serviceId }],
  });

  revalidatePath("/admin/billing");
}

export async function recordInvoicePayment(formData: FormData) {
  await requireRole(...BILLING_ROLES);
  const tenantId = await requireTenantId();

  const invoiceId = formData.get("invoiceId") as string;
  const amount = Number(formData.get("amount"));
  const mode = formData.get("mode") as PaymentMode;

  await recordPayment({ tenantId, invoiceId, amount, mode });

  revalidatePath("/admin/billing/invoices");
}

export async function markInvoicePaidAction(invoiceId: string) {
  await requireRole(...BILLING_ROLES);
  const tenantId = await requireTenantId();
  await markInvoicePaidInFull(tenantId, invoiceId);
  revalidatePath("/admin/billing/invoices");
}

export async function refundInvoicePayment(formData: FormData) {
  await requireRole(...BILLING_ROLES);
  const tenantId = await requireTenantId();

  const invoiceId = formData.get("invoiceId") as string;
  const amount = Number(formData.get("amount"));
  const reason = (formData.get("reason") as string) || undefined;

  await issueRefund({ tenantId, invoiceId, amount, reason });

  revalidatePath("/admin/billing/invoices");
}

export async function voidInvoiceAction(invoiceId: string) {
  await requireRole(...BILLING_ROLES);
  const tenantId = await requireTenantId();

  await voidInvoice(tenantId, invoiceId);

  revalidatePath("/admin/billing/invoices");
}

export async function editInvoiceAction(formData: FormData) {
  await requireRole(...BILLING_ROLES);
  const tenantId = await requireTenantId();

  const invoiceId = formData.get("invoiceId") as string;
  const description = formData.get("description") as string;
  const unitPrice = Number(formData.get("unitPrice"));

  await updateInvoiceLineItem(tenantId, invoiceId, description, unitPrice);

  revalidatePath("/admin/billing/invoices");
}
