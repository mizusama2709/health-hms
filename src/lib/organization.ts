import { db } from "@/lib/db";

export async function getOrganizationProfile(tenantId: string) {
  return db.organizationProfile.findUnique({ where: { tenantId } });
}

export async function updateOrganizationProfile(
  tenantId: string,
  params: {
    legalName?: string;
    gstNumber?: string;
    companySize?: string;
    hqAddressLine1?: string;
    hqAddressLine2?: string;
    hqCity?: string;
    hqState?: string;
    hqPostalCode?: string;
    hqCountry?: string;
  }
) {
  return db.organizationProfile.upsert({
    where: { tenantId },
    update: params,
    create: { tenantId, ...params },
  });
}
