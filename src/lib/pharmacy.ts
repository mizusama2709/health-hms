import { db } from "@/lib/db";
import { recordJourneyEvent } from "@/lib/journey";
import type { PrescriptionStatus, DoseTime, DurationUnit } from "@prisma/client";

export async function listMedicines(tenantId: string, filters?: { isActive?: boolean; lowStock?: boolean }) {
  const medicines = await db.medicine.findMany({
    where: { tenantId, ...(filters?.isActive !== undefined && { isActive: filters.isActive }) },
    orderBy: { name: "asc" },
  });

  if (filters?.lowStock) {
    return medicines.filter((m) => m.reorderLevel !== null && m.stockQuantity <= m.reorderLevel);
  }
  return medicines;
}

export async function createMedicine(params: {
  tenantId: string;
  name: string;
  sku?: string;
  unitPrice: number;
  stockQuantity?: number;
  reorderLevel?: number;
}) {
  return db.medicine.create({
    data: {
      tenantId: params.tenantId,
      name: params.name,
      sku: params.sku,
      unitPrice: params.unitPrice,
      stockQuantity: params.stockQuantity ?? 0,
      reorderLevel: params.reorderLevel,
    },
  });
}

export async function adjustMedicineStock(tenantId: string, medicineId: string, delta: number) {
  return db.medicine.updateMany({
    where: { id: medicineId, tenantId },
    data: { stockQuantity: { increment: delta } },
  });
}

export async function listSuppliers(tenantId: string) {
  return db.supplier.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export async function createSupplier(params: { tenantId: string; name: string; contactPhone?: string; contactEmail?: string }) {
  return db.supplier.create({ data: params });
}

export async function createGoodsReceipt(params: {
  tenantId: string;
  supplierId: string;
  receivedById: string;
  notes?: string;
  lineItems: { medicineId: string; quantityReceived: number; unitCost: number }[];
}) {
  return db.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.create({
      data: {
        tenantId: params.tenantId,
        supplierId: params.supplierId,
        receivedById: params.receivedById,
        notes: params.notes,
        lineItems: {
          create: params.lineItems.map((li) => ({
            medicineId: li.medicineId,
            quantityReceived: li.quantityReceived,
            unitCost: li.unitCost,
          })),
        },
      },
      include: { lineItems: true },
    });

    for (const li of params.lineItems) {
      await tx.medicine.updateMany({
        where: { id: li.medicineId, tenantId: params.tenantId },
        data: { stockQuantity: { increment: li.quantityReceived } },
      });
    }

    return receipt;
  });
}

export async function listGoodsReceipts(tenantId: string) {
  return db.goodsReceipt.findMany({
    where: { tenantId },
    include: { supplier: true, lineItems: { include: { medicine: true } } },
    orderBy: { receivedAt: "desc" },
  });
}

export async function listPrescriptions(tenantId: string, filters?: { status?: PrescriptionStatus }) {
  return db.prescription.findMany({
    where: { tenantId, ...(filters?.status && { status: filters.status }) },
    include: { patient: { include: { user: true } }, items: { include: { medicine: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPrescription(params: {
  tenantId: string;
  patientId: string;
  visitRecordId?: string;
  appointmentId?: string;
  recordedById?: string;
  items: {
    medicineId: string;
    quantity: number;
    doseTimes?: DoseTime[];
    durationValue?: number;
    durationUnit?: DurationUnit;
    dosageInstructions?: string;
  }[];
}) {
  const prescription = await db.prescription.create({
    data: {
      tenantId: params.tenantId,
      patientId: params.patientId,
      visitRecordId: params.visitRecordId,
      appointmentId: params.appointmentId,
      items: {
        create: params.items.map((i) => ({
          medicineId: i.medicineId,
          quantity: i.quantity,
          doseTimes: i.doseTimes ?? [],
          durationValue: i.durationValue,
          durationUnit: i.durationUnit,
          dosageInstructions: i.dosageInstructions,
        })),
      },
    },
    include: { items: { include: { medicine: true } } },
  });

  if (params.appointmentId) {
    await recordJourneyEvent({
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      step: "MEDICINES_PRESCRIBED",
      recordedById: params.recordedById,
    });
  }

  return prescription;
}

export async function dispensePrescription(tenantId: string, prescriptionId: string, dispensedById?: string) {
  return db.$transaction(async (tx) => {
    const prescription = await tx.prescription.findFirstOrThrow({
      where: { id: prescriptionId, tenantId },
      include: { items: true },
    });

    await tx.prescription.update({ where: { id: prescriptionId }, data: { status: "DISPENSED" } });

    for (const item of prescription.items) {
      await tx.medicine.updateMany({
        where: { id: item.medicineId, tenantId },
        data: { stockQuantity: { decrement: item.quantity } },
      });
    }

    if (prescription.appointmentId) {
      await recordJourneyEvent({
        tenantId,
        appointmentId: prescription.appointmentId,
        patientId: prescription.patientId,
        step: "MEDICINES_DISPENSED",
        recordedById: dispensedById,
      });
    }

    return prescription;
  });
}

export async function createStoreCredit(params: {
  tenantId: string;
  patientId: string;
  amount: number;
  reason?: string;
  relatedPharmacyReturnId?: string;
}) {
  return db.storeCredit.create({
    data: {
      tenantId: params.tenantId,
      patientId: params.patientId,
      amount: params.amount,
      reason: params.reason,
      relatedPharmacyReturnId: params.relatedPharmacyReturnId,
    },
  });
}

export async function listStoreCredits(tenantId: string, patientId?: string) {
  return db.storeCredit.findMany({
    where: { tenantId, ...(patientId && { patientId }) },
    include: { patient: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
}
