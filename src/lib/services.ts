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

export async function createService(params: {
  tenantId: string;
  name: string;
  serviceType: ServiceType;
  defaultUnitPrice: number;
  description?: string;
}) {
  return db.service.create({
    data: {
      tenantId: params.tenantId,
      name: params.name,
      serviceType: params.serviceType,
      defaultUnitPrice: params.defaultUnitPrice,
      description: params.description,
    },
  });
}

export async function updateService(
  tenantId: string,
  serviceId: string,
  params: Partial<{ name: string; defaultUnitPrice: number; description: string; isActive: boolean }>
) {
  return db.service.updateMany({
    where: { id: serviceId, tenantId },
    data: params,
  });
}
