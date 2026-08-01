import { db } from "@/lib/db";
import { recordJourneyEvent } from "@/lib/journey";
import { createInvoice } from "@/lib/billing";
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

export async function listMedicinesPaged(
  tenantId: string,
  filters: { search?: string; unpriced?: boolean; page?: number; pageSize?: number } = {}
) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 50;

  const where = {
    tenantId,
    ...(filters.search && { name: { contains: filters.search, mode: "insensitive" as const } }),
    ...(filters.unpriced && { unitPrice: 0 }),
  };

  const [total, medicines] = await Promise.all([
    db.medicine.count({ where }),
    db.medicine.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { medicines, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function updateMedicinePrice(tenantId: string, medicineId: string, unitPrice: number) {
  return db.medicine.updateMany({ where: { id: medicineId, tenantId }, data: { unitPrice } });
}

export type BatchExpiryFilter = "all" | "expired" | "30d" | "90d";

export async function listMedicineBatches(
  tenantId: string,
  filters: { search?: string; expiry?: BatchExpiryFilter; page?: number; pageSize?: number } = {}
) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 50;
  const now = new Date();

  const expiryWhere =
    filters.expiry === "expired"
      ? { lte: now }
      : filters.expiry === "30d"
      ? { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }
      : filters.expiry === "90d"
      ? { lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) }
      : undefined;

  const where = {
    tenantId,
    availableQty: { gt: 0 },
    ...(expiryWhere && { expiryDate: expiryWhere }),
    ...(filters.search && { medicine: { name: { contains: filters.search, mode: "insensitive" as const } } }),
  };

  const [total, rawBatches] = await Promise.all([
    db.medicineBatch.count({ where }),
    db.medicineBatch.findMany({
      where,
      orderBy: { expiryDate: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { medicine: { select: { name: true, unitPrice: true } } },
    }),
  ]);

  const batches = rawBatches.map((b) => ({
    ...b,
    daysUntilExpiry: b.expiryDate
      ? Math.floor((b.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : null,
  }));

  return { batches, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
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
  const prescriptions = await db.prescription.findMany({
    where: { tenantId, ...(filters?.status && { status: filters.status }) },
    include: { patient: { include: { user: true } }, items: { include: { medicine: true } } },
    orderBy: { createdAt: "desc" },
  });

  const invoiceIds = prescriptions.map((p) => p.invoiceId).filter((id): id is string => !!id);
  const invoices = invoiceIds.length
    ? await db.invoice.findMany({ where: { id: { in: invoiceIds }, tenantId } })
    : [];
  const invoiceById = new Map(invoices.map((inv) => [inv.id, inv]));

  return prescriptions.map((p) => ({ ...p, invoice: p.invoiceId ? invoiceById.get(p.invoiceId) ?? null : null }));
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

export async function createPharmacyInvoiceForPrescription(tenantId: string, prescriptionId: string) {
  const prescription = await db.prescription.findFirst({
    where: { id: prescriptionId, tenantId },
    include: { items: { include: { medicine: true } } },
  });
  if (!prescription) throw new Error("Prescription not found");
  if (prescription.invoiceId) throw new Error("This prescription already has an invoice");

  const invoice = await createInvoice({
    tenantId,
    patientId: prescription.patientId,
    appointmentId: prescription.appointmentId ?? undefined,
    serviceType: "PHARMACY",
    lineItems: prescription.items.map((item) => ({
      description: item.medicine.name,
      serviceType: "PHARMACY",
      quantity: item.quantity,
      unitPrice: Number(item.medicine.unitPrice),
    })),
  });

  await db.prescription.update({ where: { id: prescriptionId }, data: { invoiceId: invoice.id } });

  return invoice;
}

export async function dispensePrescription(tenantId: string, prescriptionId: string, dispensedById?: string) {
  return db.$transaction(async (tx) => {
    const prescription = await tx.prescription.findFirstOrThrow({
      where: { id: prescriptionId, tenantId },
      include: { items: true },
    });

    // Conditional claim: the WHERE clause only matches while still PENDING,
    // so two concurrent dispense calls for the same prescription can't both
    // pass — Postgres serializes the UPDATE and the loser's count is 0.
    const claimed = await tx.prescription.updateMany({
      where: { id: prescriptionId, tenantId, status: { not: "DISPENSED" } },
      data: { status: "DISPENSED" },
    });
    if (claimed.count === 0) {
      throw new Error("This prescription has already been dispensed");
    }

    for (const item of prescription.items) {
      // Conditional decrement: the WHERE clause only matches if enough stock
      // remains, so concurrent dispenses of the same medicine can't both
      // succeed and drive stock negative — the loser's count is 0.
      const result = await tx.medicine.updateMany({
        where: { id: item.medicineId, tenantId, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        const medicine = await tx.medicine.findFirst({ where: { id: item.medicineId, tenantId } });
        throw new Error(
          `Insufficient stock for ${medicine?.name ?? item.medicineId}: requested ${item.quantity}, available ${medicine?.stockQuantity ?? 0}`
        );
      }
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
