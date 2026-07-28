import { requireTenantId } from "@/lib/tenant";
import { getOrganizationProfile } from "@/lib/organization";
import { saveOrganizationProfile } from "./actions";

export default async function OrganizationPage() {
  const tenantId = await requireTenantId();
  const profile = await getOrganizationProfile(tenantId);

  return (
    <main style={{ maxWidth: 600, margin: "40px auto" }}>
      <h1>Organization</h1>
      <form action={saveOrganizationProfile} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input name="legalName" placeholder="Legal name" defaultValue={profile?.legalName ?? ""} />
        <input name="gstNumber" placeholder="GST number" defaultValue={profile?.gstNumber ?? ""} />
        <input name="companySize" placeholder="Company size" defaultValue={profile?.companySize ?? ""} />
        <input name="hqAddressLine1" placeholder="HQ address line 1" defaultValue={profile?.hqAddressLine1 ?? ""} />
        <input name="hqAddressLine2" placeholder="HQ address line 2" defaultValue={profile?.hqAddressLine2 ?? ""} />
        <input name="hqCity" placeholder="City" defaultValue={profile?.hqCity ?? ""} />
        <input name="hqState" placeholder="State" defaultValue={profile?.hqState ?? ""} />
        <input name="hqPostalCode" placeholder="Postal code" defaultValue={profile?.hqPostalCode ?? ""} />
        <input name="hqCountry" placeholder="Country" defaultValue={profile?.hqCountry ?? ""} />
        <button type="submit">Save organization profile</button>
      </form>
    </main>
  );
}
