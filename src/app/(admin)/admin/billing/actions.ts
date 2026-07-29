"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { createInvoice, recordPayment, issueRefund, voidInvoice } from "@/lib/billing";
import { db } from "@/lib/db";
import type { PaymentMode, ServiceType } from "@prisma/client";

const BILLING_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN", "RECEPTIONIST"] as const;

export async function billPatient(formData: FormData) {
  await requireRole(...BILLING_ROLES);
  const tenantId = await requireTenantId();

  const patientEmail = formData.get("patientEmail") as string;
  const serviceType = formData.get("serviceType") as ServiceType;
  const description = formData.get("description") as string;
  const unitPrice = Number(formData.get("unitPrice"));
  const quantity = Number(formData.get("quantity") || 1);
  const serviceId = (formData.get("serviceId") as string) || undefined;

  const patient = await db.patient.findFirst({
    where: { tenantId, user: { email: patientEmail } },
  });
  if (!patient) throw new Error(`No patient found in this hospital with email ${patientEmail}`);

  await createInvoice({
    tenantId,
    patientId: patient.id,
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

  revalidatePath("/admin/billing");
}

export async function refundInvoicePayment(formData: FormData) {
  await requireRole(...BILLING_ROLES);
  const tenantId = await requireTenantId();

  const invoiceId = formData.get("invoiceId") as string;
  const amount = Number(formData.get("amount"));
  const reason = (formData.get("reason") as string) || undefined;

  await issueRefund({ tenantId, invoiceId, amount, reason });

  revalidatePath("/admin/billing");
}

export async function voidInvoiceAction(formData: FormData) {
  await requireRole(...BILLING_ROLES);
  const tenantId = await requireTenantId();

  const invoiceId = formData.get("invoiceId") as string;
  await voidInvoice(tenantId, invoiceId);

  revalidatePath("/admin/billing");
}
