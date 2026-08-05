import { db } from "@/lib/db";

export async function listRxTemplates(tenantId: string) {
  return db.rxTemplate.findMany({
    where: { tenantId },
    include: { items: { include: { medicine: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listRxTemplatesPaged(tenantId: string, filters: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 50;
  const where = { tenantId };

  const [total, templates] = await Promise.all([
    db.rxTemplate.count({ where }),
    db.rxTemplate.findMany({
      where,
      include: { items: { include: { medicine: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { templates, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function createRxTemplate(params: {
  tenantId: string;
  name: string;
  diseaseTag: string;
  items: { medicineId: string; quantity: number; dosageInstructions?: string }[];
}) {
  return db.rxTemplate.create({
    data: {
      tenantId: params.tenantId,
      name: params.name,
      diseaseTag: params.diseaseTag,
      items: {
        create: params.items.map((i) => ({
          medicineId: i.medicineId,
          quantity: i.quantity,
          dosageInstructions: i.dosageInstructions,
        })),
      },
    },
    include: { items: true },
  });
}

export async function getRxTemplateWithItems(templateId: string, tenantId: string) {
  return db.rxTemplate.findFirst({
    where: { id: templateId, tenantId },
    include: { items: { include: { medicine: true } } },
  });
}
