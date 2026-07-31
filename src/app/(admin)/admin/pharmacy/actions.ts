"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import {
  createMedicine,
  createSupplier,
  createGoodsReceipt,
  createPrescription,
  createPharmacyInvoiceForPrescription,
  dispensePrescription,
} from "@/lib/pharmacy";
import { recordPayment } from "@/lib/billing";
import { createRxTemplate, getRxTemplateWithItems } from "@/lib/rxTemplates";
import { recordPharmacyReturn } from "@/lib/hospitalSettings";
import { db } from "@/lib/db";
import type { PaymentMode } from "@prisma/client";

const PHARMACY_ROLES = ["PHARMACIST", "ADMIN_RECEPTION", "SUPER_ADMIN"] as const;

export async function createMedicineAction(formData: FormData) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const sku = (formData.get("sku") as string) || undefined;
  const unitPrice = Number(formData.get("unitPrice"));
  const stockQuantity = Number(formData.get("stockQuantity") || 0);
  const reorderLevel = formData.get("reorderLevel") ? Number(formData.get("reorderLevel")) : undefined;

  await createMedicine({ tenantId, name, sku, unitPrice, stockQuantity, reorderLevel });

  revalidatePath("/admin/pharmacy/medicines");
}

export async function createSupplierAction(formData: FormData) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const contactPhone = (formData.get("contactPhone") as string) || undefined;
  const contactEmail = (formData.get("contactEmail") as string) || undefined;

  await createSupplier({ tenantId, name, contactPhone, contactEmail });

  revalidatePath("/admin/pharmacy/suppliers");
}

export async function createGoodsReceiptAction(formData: FormData) {
  const session = await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const supplierId = formData.get("supplierId") as string;
  const medicineId = formData.get("medicineId") as string;
  const quantityReceived = Number(formData.get("quantityReceived"));
  const unitCost = Number(formData.get("unitCost"));
  const notes = (formData.get("notes") as string) || undefined;

  await createGoodsReceipt({
    tenantId,
    supplierId,
    receivedById: session.user.id,
    notes,
    lineItems: [{ medicineId, quantityReceived, unitCost }],
  });

  revalidatePath("/admin/pharmacy/goods-receipt");
  revalidatePath("/admin/pharmacy/medicines");
}

export async function createPrescriptionAction(formData: FormData) {
  const session = await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const patientEmail = formData.get("patientEmail") as string;
  const medicineId = formData.get("medicineId") as string;
  const quantity = Number(formData.get("quantity"));
  const dosageInstructions = (formData.get("dosageInstructions") as string) || undefined;

  const patient = await db.patient.findFirst({ where: { tenantId, user: { email: patientEmail } } });
  if (!patient) throw new Error(`No patient found in this hospital with email ${patientEmail}`);

  await createPrescription({
    tenantId,
    patientId: patient.id,
    recordedById: session.user.id,
    items: [{ medicineId, quantity, dosageInstructions }],
  });

  revalidatePath("/admin/pharmacy/dispense");
}

export async function createPharmacyInvoiceAction(formData: FormData) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const prescriptionId = formData.get("prescriptionId") as string;
  await createPharmacyInvoiceForPrescription(tenantId, prescriptionId);

  revalidatePath("/admin/pharmacy/dispense");
}

export async function recordPharmacyPaymentAction(formData: FormData) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const invoiceId = formData.get("invoiceId") as string;
  const amount = Number(formData.get("amount"));
  const mode = formData.get("mode") as PaymentMode;
  const reference = (formData.get("reference") as string) || undefined;

  await recordPayment({ tenantId, invoiceId, amount, mode, reference });

  revalidatePath("/admin/pharmacy/dispense");
}

export async function dispensePrescriptionAction(formData: FormData) {
  const session = await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const prescriptionId = formData.get("prescriptionId") as string;
  await dispensePrescription(tenantId, prescriptionId, session.user.id);

  revalidatePath("/admin/pharmacy/dispense");
  revalidatePath("/admin/pharmacy/medicines");
}

export async function recordPharmacyReturnAction(formData: FormData) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const invoiceLineItemId = formData.get("invoiceLineItemId") as string;
  const quantityReturned = Number(formData.get("quantityReturned"));
  const refundAmount = formData.get("refundAmount") ? Number(formData.get("refundAmount")) : undefined;
  const reason = (formData.get("reason") as string) || undefined;
  const asStoreCredit = formData.get("asStoreCredit") === "true";
  const patientEmail = formData.get("patientEmail") as string;

  const lineItem = await db.invoiceLineItem.findFirstOrThrow({
    where: { id: invoiceLineItemId, invoice: { tenantId } },
  });

  let storeCreditPatient: { patientId: string } | undefined;
  if (asStoreCredit) {
    const patient = await db.patient.findFirst({ where: { tenantId, user: { email: patientEmail } } });
    if (!patient) throw new Error(`No patient found in this hospital with email ${patientEmail}`);
    storeCreditPatient = { patientId: patient.id };
  }

  await recordPharmacyReturn({
    tenantId,
    invoiceLineItemId,
    invoiceId: lineItem.invoiceId,
    quantityReturned,
    refundAmount,
    reason,
    asStoreCredit: storeCreditPatient,
  });

  revalidatePath("/admin/pharmacy/store-credit");
}

export async function createRxTemplateAction(formData: FormData) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const diseaseTag = formData.get("diseaseTag") as string;
  const medicineIds = formData.getAll("medicineId") as string[];
  const quantities = formData.getAll("quantity") as string[];
  const dosages = formData.getAll("dosageInstructions") as string[];

  const items = medicineIds.map((medicineId, i) => ({
    medicineId,
    quantity: Number(quantities[i]),
    dosageInstructions: dosages[i] || undefined,
  }));

  await createRxTemplate({ tenantId, name, diseaseTag, items });

  revalidatePath("/admin/pharmacy/rx-templates");
}

export async function loadRxTemplateAction(formData: FormData) {
  const session = await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const templateId = formData.get("templateId") as string;
  const patientEmail = formData.get("patientEmail") as string;

  const template = await getRxTemplateWithItems(templateId, tenantId);
  if (!template) throw new Error("Template not found");

  const patient = await db.patient.findFirst({ where: { tenantId, user: { email: patientEmail } } });
  if (!patient) throw new Error(`No patient found in this hospital with email ${patientEmail}`);

  await createPrescription({
    tenantId,
    patientId: patient.id,
    recordedById: session.user.id,
    items: template.items.map((i) => ({
      medicineId: i.medicineId,
      quantity: i.quantity,
      dosageInstructions: i.dosageInstructions ?? undefined,
    })),
  });

  revalidatePath("/admin/pharmacy/dispense");
}
