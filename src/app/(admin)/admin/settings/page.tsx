import { requireTenantId } from "@/lib/tenant";
import { getHospitalSettings } from "@/lib/hospitalSettings";
import {
  saveHospitalSettings,
  savePaymentSettingsAction,
  addDepartmentAction,
  removeDepartmentAction,
} from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function HospitalSettingsPage() {
  const tenantId = await requireTenantId();
  const settings = await getHospitalSettings(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Hospital Settings</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveHospitalSettings} className="flex flex-col gap-2">
            <Label htmlFor="registrationNumber">Registration number</Label>
            <Input id="registrationNumber" name="registrationNumber" defaultValue={settings?.registrationNumber ?? ""} />
            <Label htmlFor="addressLine1">Address line 1</Label>
            <Input id="addressLine1" name="addressLine1" defaultValue={settings?.addressLine1 ?? ""} />
            <Label htmlFor="addressLine2">Address line 2</Label>
            <Input id="addressLine2" name="addressLine2" defaultValue={settings?.addressLine2 ?? ""} />
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={settings?.city ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" defaultValue={settings?.state ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="postalCode">Postal code</Label>
                <Input id="postalCode" name="postalCode" defaultValue={settings?.postalCode ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bookingLeadTimeMinutes">Booking lead time (minutes)</Label>
                <Input
                  id="bookingLeadTimeMinutes"
                  name="bookingLeadTimeMinutes"
                  type="number"
                  defaultValue={settings?.bookingLeadTimeMinutes ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cancellationWindowMinutes">Cancellation window (minutes)</Label>
                <Input
                  id="cancellationWindowMinutes"
                  name="cancellationWindowMinutes"
                  type="number"
                  defaultValue={settings?.cancellationWindowMinutes ?? ""}
                />
              </div>
            </div>
            <Label htmlFor="bookingPolicyNotes">Booking policy notes</Label>
            <Textarea id="bookingPolicyNotes" name="bookingPolicyNotes" defaultValue={settings?.bookingPolicyNotes ?? ""} />
            <Label htmlFor="pharmacyGstNumber">Pharmacy GST number</Label>
            <Input id="pharmacyGstNumber" name="pharmacyGstNumber" defaultValue={settings?.pharmacyGstNumber ?? ""} />
            <Label htmlFor="invoiceHeaderText">Invoice header text</Label>
            <Input id="invoiceHeaderText" name="invoiceHeaderText" defaultValue={settings?.invoiceHeaderText ?? ""} />
            <Label htmlFor="pharmacyInvoiceTemplate">Pharmacy invoice template</Label>
            <Textarea
              id="pharmacyInvoiceTemplate"
              name="pharmacyInvoiceTemplate"
              defaultValue={settings?.pharmacyInvoiceTemplate ?? ""}
            />
            <Button type="submit" className="mt-2 self-start">
              Save settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Payment settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={savePaymentSettingsAction} className="flex flex-col gap-2">
            <Label htmlFor="paymentUpiId">UPI ID</Label>
            <Input id="paymentUpiId" name="paymentUpiId" defaultValue={settings?.paymentUpiId ?? ""} />
            <Label htmlFor="paymentPayeeName">Payee name</Label>
            <Input id="paymentPayeeName" name="paymentPayeeName" defaultValue={settings?.paymentPayeeName ?? ""} />
            <Label htmlFor="razorpayPaymentLink">Razorpay payment link</Label>
            <Input id="razorpayPaymentLink" name="razorpayPaymentLink" defaultValue={settings?.razorpayPaymentLink ?? ""} />
            <Label htmlFor="labUpiId">Lab UPI ID</Label>
            <Input id="labUpiId" name="labUpiId" defaultValue={settings?.labUpiId ?? ""} />
            <Label htmlFor="pharmacyUpiId">Pharmacy UPI ID</Label>
            <Input id="pharmacyUpiId" name="pharmacyUpiId" defaultValue={settings?.pharmacyUpiId ?? ""} />
            <Button type="submit" className="mt-2 self-start">
              Save payment settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {settings?.departments.map((d) => (
              <li key={d.id} className="flex items-center gap-2">
                <Badge variant="secondary">{d.name}</Badge>
                <form action={removeDepartmentAction}>
                  <input type="hidden" name="departmentId" value={d.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addDepartmentAction} className="flex gap-2">
            <Input name="name" placeholder="Department name" required />
            <Button type="submit" variant="outline">
              Add department
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
