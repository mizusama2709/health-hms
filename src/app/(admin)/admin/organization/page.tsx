import { requireTenantId } from "@/lib/tenant";
import { getOrganizationProfile } from "@/lib/organization";
import { saveOrganizationProfile } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Organization",
};

export default async function OrganizationPage() {
  const tenantId = await requireTenantId();
  const profile = await getOrganizationProfile(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Organization</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveOrganizationProfile} className="flex flex-col gap-2">
            <Label htmlFor="legalName">Legal name</Label>
            <Input id="legalName" name="legalName" placeholder="Legal name" defaultValue={profile?.legalName ?? ""} />
            <Label htmlFor="gstNumber">GST number</Label>
            <Input id="gstNumber" name="gstNumber" placeholder="GST number" defaultValue={profile?.gstNumber ?? ""} />
            <Label htmlFor="companySize">Company size</Label>
            <Input id="companySize" name="companySize" placeholder="Company size" defaultValue={profile?.companySize ?? ""} />
            <Label htmlFor="hqAddressLine1">HQ address line 1</Label>
            <Input id="hqAddressLine1" name="hqAddressLine1" placeholder="HQ address line 1" defaultValue={profile?.hqAddressLine1 ?? ""} />
            <Label htmlFor="hqAddressLine2">HQ address line 2</Label>
            <Input id="hqAddressLine2" name="hqAddressLine2" placeholder="HQ address line 2" defaultValue={profile?.hqAddressLine2 ?? ""} />
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="hqCity">City</Label>
                <Input id="hqCity" name="hqCity" placeholder="City" defaultValue={profile?.hqCity ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="hqState">State</Label>
                <Input id="hqState" name="hqState" placeholder="State" defaultValue={profile?.hqState ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="hqPostalCode">Postal code</Label>
                <Input id="hqPostalCode" name="hqPostalCode" placeholder="Postal code" defaultValue={profile?.hqPostalCode ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="hqCountry">Country</Label>
                <Input id="hqCountry" name="hqCountry" placeholder="Country" defaultValue={profile?.hqCountry ?? ""} />
              </div>
            </div>
            <Button type="submit" className="mt-2">
              Save organization profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
