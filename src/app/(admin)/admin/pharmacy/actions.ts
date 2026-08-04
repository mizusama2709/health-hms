"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import {
  createMedicine,
  createSupplier,
  updateSupplier,
  createGoodsReceipt,
  createPrescription,
  createPharmacyInvoiceForPrescription,
  dispensePrescription,
  billCollectAndDispensePrescription,
  updateMedicinePrice,
  searchMedicines,
  bulkUpdateMedicinePrices,
} from "@/lib/pharmacy";
import { recordPayment } from "@/lib/billing";
import { createRxTemplate, getRxTemplateWithItems } from "@/lib/rxTemplates";
import { recordPharmacyReturn } from "@/lib/hospitalSettings";
import { searchPatients } from "@/lib/patients";
import { withActionResult } from "@/lib/actionResult";
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

export async function bulkUpdateMedicinePricesAction(formData: FormData) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/pharmacy/medicines?unpriced=true&bulkError=" + encodeURIComponent("Choose a CSV file first"));
  }

  const csvText = await file.text();
  const { matched, notFound, invalidRows } = await bulkUpdateMedicinePrices(tenantId, csvText);

  revalidatePath("/admin/pharmacy/medicines");
  redirect(`/admin/pharmacy/medicines?unpriced=true&bulkResult=${matched},${notFound},${invalidRows}`);
}

export async function searchMedicinesAction(query: string) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();
  return searchMedicines(tenantId, query);
}

export async function searchPatientsAction(query: string) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();
  return searchPatients(tenantId, query);
}

export async function updateMedicinePriceAction(formData: FormData) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const medicineId = formData.get("medicineId") as string;
  const unitPrice = Number(formData.get("unitPrice"));

  await updateMedicinePrice(tenantId, medicineId, unitPrice);

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

export const createSupplierActionResult = withActionResult(createSupplierAction, "Supplier added");

export async function updateSupplierAction(formData: FormData) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const supplierId = formData.get("supplierId") as string;
  const name = formData.get("name") as string;
  const contactPhone = (formData.get("contactPhone") as string) || undefined;
  const contactEmail = (formData.get("contactEmail") as string) || undefined;

  await updateSupplier(tenantId, supplierId, { name, contactPhone, contactEmail });

  revalidatePath("/admin/pharmacy/suppliers");
}

export const updateSupplierActionResult = withActionResult(updateSupplierAction, "Supplier updated");

export async function toggleSupplierActiveAction(formData: FormData) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const supplierId = formData.get("supplierId") as string;
  const isActive = formData.get("isActive") === "true";

  await updateSupplier(tenantId, supplierId, { isActive: !isActive });

  revalidatePath("/admin/pharmacy/suppliers");
}

export const toggleSupplierActiveActionResult = withActionResult(toggleSupplierActiveAction, "Supplier updated");

export async function createGoodsReceiptAction(formData: FormData) {
  const session = await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const supplierId = formData.get("supplierId") as string;
  const medicineId = formData.get("medicineId") as string;
  const quantityReceived = Number(formData.get("quantityReceived"));
  const unitCost = Number(formData.get("unitCost"));
  const notes = (formData.get("notes") as string) || undefined;

  if (!Number.isFinite(quantityReceived) || quantityReceived <= 0) {
    throw new Error("Quantity received must be a positive number");
  }
  if (!Number.isFinite(unitCost) || unitCost < 0) {
    throw new Error("Unit cost must be zero or a positive number");
  }

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

export const createGoodsReceiptActionResult = withActionResult(createGoodsReceiptAction, "Receipt recorded");

export async function createPrescriptionAction(formData: FormData) {
  const session = await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const patientId = formData.get("patientId") as string;
  const medicineId = formData.get("medicineId") as string;
  const quantity = Number(formData.get("quantity"));
  const dosageInstructions = (formData.get("dosageInstructions") as string) || undefined;

  const patient = await db.patient.findFirst({ where: { id: patientId, tenantId } });
  if (!patient) throw new Error("Select a patient before prescribing");

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

export async function billCollectAndDispenseAction(formData: FormData) {
  const session = await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const prescriptionId = formData.get("prescriptionId") as string;
  const mode = formData.get("mode") as PaymentMode;

  await billCollectAndDispensePrescription(tenantId, prescriptionId, mode, session.user.id);

  revalidatePath("/admin/pharmacy/dispense");
  revalidatePath("/admin/pharmacy/medicines");
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

// Toast-friendly variants of the actions above, for use with <ActionForm> —
// see withActionResult in src/lib/actionResult.ts for why these are thin
// wrappers rather than rewritten action bodies.
export const createPrescriptionActionResult = withActionResult(createPrescriptionAction, "Prescription created");
export const loadRxTemplateActionResult = withActionResult(loadRxTemplateAction, "Template loaded — prescription created");
export const createPharmacyInvoiceActionResult = withActionResult(createPharmacyInvoiceAction, "Invoice created");
export const billCollectAndDispenseActionResult = withActionResult(billCollectAndDispenseAction, "Billed, collected & dispensed");
export const recordPharmacyPaymentActionResult = withActionResult(recordPharmacyPaymentAction, "Payment recorded");
export const dispensePrescriptionActionResult = withActionResult(dispensePrescriptionAction, "Dispensed");

export async function recordPharmacyReturnAction(formData: FormData) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const invoiceLineItemId = formData.get("invoiceLineItemId") as string;
  const quantityReturned = Number(formData.get("quantityReturned"));
  const refundAmount = formData.get("refundAmount") ? Number(formData.get("refundAmount")) : undefined;
  const reason = (formData.get("reason") as string) || undefined;
  const asStoreCredit = formData.get("asStoreCredit") === "true";
  const patientId = formData.get("patientId") as string;

  const lineItem = await db.invoiceLineItem.findFirstOrThrow({
    where: { id: invoiceLineItemId, invoice: { tenantId } },
  });

  if (!Number.isFinite(quantityReturned) || quantityReturned < 1 || quantityReturned > lineItem.quantity) {
    throw new Error(`Quantity returned must be between 1 and ${lineItem.quantity} (the quantity originally sold)`);
  }
  if (refundAmount !== undefined && (!Number.isFinite(refundAmount) || refundAmount < 0 || refundAmount > Number(lineItem.lineTotal))) {
    throw new Error(`Refund amount can't exceed the original line total (${Number(lineItem.lineTotal).toFixed(2)})`);
  }

  let storeCreditPatient: { patientId: string } | undefined;
  if (asStoreCredit) {
    const patient = await db.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new Error("Select a patient before issuing store credit");
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

export const recordPharmacyReturnActionResult = withActionResult(recordPharmacyReturnAction, "Return recorded");

export async function createRxTemplateAction(formData: FormData) {
  await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const diseaseTag = formData.get("diseaseTag") as string;
  const medicineIds = formData.getAll("medicineId") as string[];
  const quantities = formData.getAll("quantity") as string[];
  const dosages = formData.getAll("dosageInstructions") as string[];

  const items = medicineIds
    .map((medicineId, i) => ({
      medicineId,
      quantity: Number(quantities[i]),
      dosageInstructions: dosages[i] || undefined,
    }))
    .filter((item) => item.medicineId);

  await createRxTemplate({ tenantId, name, diseaseTag, items });

  revalidatePath("/admin/pharmacy/rx-templates");
}

export const createRxTemplateActionResult = withActionResult(createRxTemplateAction, "Template created");

export async function loadRxTemplateAction(formData: FormData) {
  const session = await requireRole(...PHARMACY_ROLES);
  const tenantId = await requireTenantId();

  const templateId = formData.get("templateId") as string;
  const patientId = formData.get("patientId") as string;

  const template = await getRxTemplateWithItems(templateId, tenantId);
  if (!template) throw new Error("Template not found");

  const patient = await db.patient.findFirst({ where: { id: patientId, tenantId } });
  if (!patient) throw new Error("Select a patient before loading a template");

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
