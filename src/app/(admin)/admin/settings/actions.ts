"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import {
  updateHospitalSettings,
  savePaymentSettings,
  addDepartment,
  removeDepartment,
  recordPharmacyReturn,
} from "@/lib/hospitalSettings";
import { db } from "@/lib/db";

const SETTINGS_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN"] as const;

export async function saveHospitalSettings(formData: FormData) {
  await requireRole(...SETTINGS_ROLES);
  const tenantId = await requireTenantId();

  const field = (name: string) => (formData.get(name) as string) || undefined;
  const num = (name: string) => {
    const v = formData.get(name) as string;
    return v ? Number(v) : undefined;
  };

  await updateHospitalSettings(tenantId, {
    registrationNumber: field("registrationNumber"),
    addressLine1: field("addressLine1"),
    addressLine2: field("addressLine2"),
    city: field("city"),
    state: field("state"),
    postalCode: field("postalCode"),
    bookingLeadTimeMinutes: num("bookingLeadTimeMinutes"),
    cancellationWindowMinutes: num("cancellationWindowMinutes"),
    bookingPolicyNotes: field("bookingPolicyNotes"),
    pharmacyGstNumber: field("pharmacyGstNumber"),
    invoiceHeaderText: field("invoiceHeaderText"),
    pharmacyInvoiceTemplate: field("pharmacyInvoiceTemplate"),
  });

  revalidatePath("/admin/settings");
}

export async function savePaymentSettingsAction(formData: FormData) {
  await requireRole(...SETTINGS_ROLES);
  const tenantId = await requireTenantId();

  const field = (name: string) => (formData.get(name) as string) || undefined;

  await savePaymentSettings(tenantId, {
    paymentUpiId: field("paymentUpiId"),
    paymentPayeeName: field("paymentPayeeName"),
    razorpayPaymentLink: field("razorpayPaymentLink"),
    labUpiId: field("labUpiId"),
    pharmacyUpiId: field("pharmacyUpiId"),
  });

  revalidatePath("/admin/settings");
}

export async function addDepartmentAction(formData: FormData) {
  await requireRole(...SETTINGS_ROLES);
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  await addDepartment(tenantId, name);

  revalidatePath("/admin/settings");
}

export async function removeDepartmentAction(formData: FormData) {
  await requireRole(...SETTINGS_ROLES);
  const tenantId = await requireTenantId();

  const departmentId = formData.get("departmentId") as string;
  await removeDepartment(tenantId, departmentId);

  revalidatePath("/admin/settings");
}

export async function recordPharmacyReturnAction(formData: FormData) {
  await requireRole(...SETTINGS_ROLES);
  const tenantId = await requireTenantId();

  const invoiceLineItemId = formData.get("invoiceLineItemId") as string;
  const quantityReturned = Number(formData.get("quantityReturned"));
  const refundAmount = formData.get("refundAmount") ? Number(formData.get("refundAmount")) : undefined;
  const reason = (formData.get("reason") as string) || undefined;

  const lineItem = await db.invoiceLineItem.findFirstOrThrow({
    where: { id: invoiceLineItemId, invoice: { tenantId } },
  });

  await recordPharmacyReturn({
    tenantId,
    invoiceLineItemId,
    invoiceId: lineItem.invoiceId,
    quantityReturned,
    refundAmount,
    reason,
  });

  revalidatePath("/admin/settings");
}
