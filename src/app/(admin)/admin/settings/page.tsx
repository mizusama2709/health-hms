import { requireTenantId } from "@/lib/tenant";
import { getHospitalSettings } from "@/lib/hospitalSettings";
import { listInvoices } from "@/lib/billing";
import {
  saveHospitalSettings,
  savePaymentSettingsAction,
  addDepartmentAction,
  removeDepartmentAction,
  recordPharmacyReturnAction,
} from "./actions";

export default async function HospitalSettingsPage() {
  const tenantId = await requireTenantId();
  const [settings, pharmacyInvoices] = await Promise.all([
    getHospitalSettings(tenantId),
    listInvoices(tenantId, { serviceType: "PHARMACY" }),
  ]);

  const pharmacyLineItems = pharmacyInvoices.flatMap((inv) =>
    inv.lineItems.map((li) => ({ ...li, invoiceId: inv.id, invoiceNumber: inv.invoiceNumber }))
  );

  return (
    <main style={{ maxWidth: 700, margin: "40px auto" }}>
      <h1>Hospital Settings</h1>

      <section style={{ marginTop: 24 }}>
        <h2>General</h2>
        <form action={saveHospitalSettings} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input name="registrationNumber" placeholder="Registration number" defaultValue={settings?.registrationNumber ?? ""} />
          <input name="addressLine1" placeholder="Address line 1" defaultValue={settings?.addressLine1 ?? ""} />
          <input name="addressLine2" placeholder="Address line 2" defaultValue={settings?.addressLine2 ?? ""} />
          <input name="city" placeholder="City" defaultValue={settings?.city ?? ""} />
          <input name="state" placeholder="State" defaultValue={settings?.state ?? ""} />
          <input name="postalCode" placeholder="Postal code" defaultValue={settings?.postalCode ?? ""} />
          <input name="bookingLeadTimeMinutes" type="number" placeholder="Booking lead time (minutes)" defaultValue={settings?.bookingLeadTimeMinutes ?? ""} />
          <input name="cancellationWindowMinutes" type="number" placeholder="Cancellation window (minutes)" defaultValue={settings?.cancellationWindowMinutes ?? ""} />
          <textarea name="bookingPolicyNotes" placeholder="Booking policy notes" defaultValue={settings?.bookingPolicyNotes ?? ""} />
          <input name="pharmacyGstNumber" placeholder="Pharmacy GST number" defaultValue={settings?.pharmacyGstNumber ?? ""} />
          <input name="invoiceHeaderText" placeholder="Invoice header text" defaultValue={settings?.invoiceHeaderText ?? ""} />
          <textarea name="pharmacyInvoiceTemplate" placeholder="Pharmacy invoice template" defaultValue={settings?.pharmacyInvoiceTemplate ?? ""} />
          <button type="submit">Save settings</button>
        </form>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Payment settings</h2>
        <form action={savePaymentSettingsAction} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
          <input name="paymentUpiId" placeholder="UPI ID" defaultValue={settings?.paymentUpiId ?? ""} />
          <input name="paymentPayeeName" placeholder="Payee name" defaultValue={settings?.paymentPayeeName ?? ""} />
          <input name="razorpayPaymentLink" placeholder="Razorpay payment link" defaultValue={settings?.razorpayPaymentLink ?? ""} />
          <input name="labUpiId" placeholder="Lab UPI ID" defaultValue={settings?.labUpiId ?? ""} />
          <input name="pharmacyUpiId" placeholder="Pharmacy UPI ID" defaultValue={settings?.pharmacyUpiId ?? ""} />
          <button type="submit">Save payment settings</button>
        </form>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Departments</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {settings?.departments.map((d) => (
            <li key={d.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              {d.name}
              <form action={removeDepartmentAction}>
                <input type="hidden" name="departmentId" value={d.id} />
                <button type="submit">Remove</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addDepartmentAction} style={{ display: "flex", gap: 8, maxWidth: 300 }}>
          <input name="name" placeholder="Department name" required />
          <button type="submit">Add department</button>
        </form>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Pharmacy returns</h2>
        {pharmacyLineItems.length === 0 && <p>No pharmacy line items to return yet.</p>}
        {pharmacyLineItems.length > 0 && (
          <form action={recordPharmacyReturnAction} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
            <select name="invoiceLineItemId" required>
              {pharmacyLineItems.map((li) => (
                <option key={li.id} value={li.id}>
                  {li.invoiceNumber} — {li.description} (qty {li.quantity})
                </option>
              ))}
            </select>
            <input name="quantityReturned" type="number" placeholder="Quantity returned" min={1} required />
            <input name="refundAmount" type="number" step="0.01" placeholder="Refund amount (optional)" />
            <input name="reason" placeholder="Reason" />
            <button type="submit">Record return</button>
          </form>
        )}
      </section>
    </main>
  );
}
