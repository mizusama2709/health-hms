import { db } from "@/lib/db";
import type { ServiceType } from "@prisma/client";

export async function listServices(tenantId: string, filters?: { serviceType?: ServiceType; isActive?: boolean }) {
  return db.service.findMany({
    where: {
      tenantId,
      ...(filters?.serviceType && { serviceType: filters.serviceType }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
    },
    orderBy: { name: "asc" },
  });
}

export async function listServicesPaged(
  tenantId: string,
  filters?: { serviceType?: ServiceType; isActive?: boolean; page?: number; pageSize?: number }
) {
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = filters?.pageSize ?? 50;
  const where = {
    tenantId,
    ...(filters?.serviceType && { serviceType: filters.serviceType }),
    ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
  };

  const [total, services] = await Promise.all([
    db.service.count({ where }),
    db.service.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { services, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function createService(params: {
  tenantId: string;
  name: string;
  serviceType: ServiceType;
  defaultUnitPrice: number;
  taxRatePercent?: number;
  description?: string;
}) {
  return db.service.create({
    data: {
      tenantId: params.tenantId,
      name: params.name,
      serviceType: params.serviceType,
      defaultUnitPrice: params.defaultUnitPrice,
      taxRatePercent: params.taxRatePercent ?? 0,
      description: params.description,
    },
  });
}

export async function updateService(
  tenantId: string,
  serviceId: string,
  params: Partial<{ name: string; defaultUnitPrice: number; taxRatePercent: number; description: string; isActive: boolean }>
) {
  return db.service.updateMany({
    where: { id: serviceId, tenantId },
    data: params,
  });
}
