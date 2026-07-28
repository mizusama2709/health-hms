"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { updateOrganizationProfile } from "@/lib/organization";

export async function saveOrganizationProfile(formData: FormData) {
  await requireRole("ADMIN_RECEPTION", "SUPER_ADMIN");
  const tenantId = await requireTenantId();

  const field = (name: string) => (formData.get(name) as string) || undefined;

  await updateOrganizationProfile(tenantId, {
    legalName: field("legalName"),
    gstNumber: field("gstNumber"),
    companySize: field("companySize"),
    hqAddressLine1: field("hqAddressLine1"),
    hqAddressLine2: field("hqAddressLine2"),
    hqCity: field("hqCity"),
    hqState: field("hqState"),
    hqPostalCode: field("hqPostalCode"),
    hqCountry: field("hqCountry"),
  });

  revalidatePath("/admin/organization");
}
