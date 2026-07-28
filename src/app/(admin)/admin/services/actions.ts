"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { createService, updateService } from "@/lib/services";
import type { ServiceType } from "@prisma/client";

const SERVICE_ADMIN_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN"] as const;

export async function createServiceAction(formData: FormData) {
  await requireRole(...SERVICE_ADMIN_ROLES);
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const serviceType = formData.get("serviceType") as ServiceType;
  const defaultUnitPrice = Number(formData.get("defaultUnitPrice"));
  const description = (formData.get("description") as string) || undefined;

  await createService({ tenantId, name, serviceType, defaultUnitPrice, description });

  revalidatePath("/admin/services");
}

export async function toggleServiceActiveAction(formData: FormData) {
  await requireRole(...SERVICE_ADMIN_ROLES);
  const tenantId = await requireTenantId();

  const serviceId = formData.get("serviceId") as string;
  const isActive = formData.get("isActive") === "true";

  await updateService(tenantId, serviceId, { isActive: !isActive });

  revalidatePath("/admin/services");
}
