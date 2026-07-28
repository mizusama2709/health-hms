import { db } from "@/lib/db";

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
