import { db } from "@/lib/db";

async function ensureHospitalSettings(tenantId: string) {
  return db.hospitalSettings.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId },
  });
}

export async function getHospitalSettings(tenantId: string) {
  return db.hospitalSettings.findUnique({
    where: { tenantId },
    include: { departments: true },
  });
}

export async function updateHospitalSettings(
  tenantId: string,
  params: {
    registrationNumber?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    bookingLeadTimeMinutes?: number;
    cancellationWindowMinutes?: number;
    bookingPolicyNotes?: string;
    pharmacyGstNumber?: string;
    invoiceHeaderLogoUrl?: string;
    invoiceHeaderText?: string;
    pharmacyInvoiceTemplate?: string;
  }
) {
  return db.hospitalSettings.upsert({
    where: { tenantId },
    update: params,
    create: { tenantId, ...params },
  });
}

export async function savePaymentSettings(
  tenantId: string,
  params: {
    paymentQrImageUrl?: string;
    paymentUpiId?: string;
    paymentPayeeName?: string;
    razorpayPaymentLink?: string;
    labUpiId?: string;
    pharmacyUpiId?: string;
  }
) {
  return db.hospitalSettings.upsert({
    where: { tenantId },
    update: params,
    create: { tenantId, ...params },
  });
}

export async function listDepartments(tenantId: string) {
  return db.department.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export async function addDepartment(tenantId: string, name: string) {
  const settings = await ensureHospitalSettings(tenantId);
  return db.department.create({
    data: { tenantId, hospitalSettingsId: settings.id, name },
  });
}

export async function removeDepartment(tenantId: string, departmentId: string) {
  return db.department.deleteMany({ where: { id: departmentId, tenantId } });
}

export async function recordPharmacyReturn(params: {
  tenantId: string;
  invoiceLineItemId: string;
  invoiceId: string;
  quantityReturned: number;
  refundAmount?: number;
  reason?: string;
  recordedById?: string;
}) {
  return db.pharmacyReturn.create({
    data: {
      tenantId: params.tenantId,
      invoiceLineItemId: params.invoiceLineItemId,
      invoiceId: params.invoiceId,
      quantityReturned: params.quantityReturned,
      refundAmount: params.refundAmount,
      reason: params.reason,
      recordedById: params.recordedById,
    },
  });
}
