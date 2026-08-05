"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { createService, updateService, bulkSetServicesActive } from "@/lib/services";
import { withActionResult } from "@/lib/actionResult";
import type { ServiceType } from "@prisma/client";

const SERVICE_ADMIN_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN"] as const;

export async function createServiceAction(formData: FormData) {
  await requireRole(...SERVICE_ADMIN_ROLES);
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const serviceType = formData.get("serviceType") as ServiceType;
  const defaultUnitPrice = Number(formData.get("defaultUnitPrice"));
  const taxRatePercent = Number(formData.get("taxRatePercent") || 0);
  const description = (formData.get("description") as string) || undefined;

  await createService({ tenantId, name, serviceType, defaultUnitPrice, taxRatePercent, description });

  revalidatePath("/admin/services");
}

export const createServiceActionResult = withActionResult(createServiceAction, "Service added");

export async function toggleServiceActiveAction(formData: FormData) {
  await requireRole(...SERVICE_ADMIN_ROLES);
  const tenantId = await requireTenantId();

  const serviceId = formData.get("serviceId") as string;
  const isActive = formData.get("isActive") === "true";

  await updateService(tenantId, serviceId, { isActive: !isActive });

  revalidatePath("/admin/services");
}

export const toggleServiceActiveActionResult = withActionResult(toggleServiceActiveAction, "Service updated");

export async function bulkSetServicesActiveAction(formData: FormData) {
  await requireRole(...SERVICE_ADMIN_ROLES);
  const tenantId = await requireTenantId();

  const serviceIds = formData.getAll("serviceIds") as string[];
  const isActive = formData.get("isActive") === "true";
  if (serviceIds.length === 0) throw new Error("No services selected");

  const result = await bulkSetServicesActive(tenantId, serviceIds, isActive);

  revalidatePath("/admin/services");
  return { success: true, message: `${result.count} service${result.count === 1 ? "" : "s"} ${isActive ? "activated" : "deactivated"}` };
}

export const bulkSetServicesActiveActionResult = withActionResult(bulkSetServicesActiveAction);
