"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { createMedicine, createSupplier, createGoodsReceipt } from "@/lib/pharmacy";

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
