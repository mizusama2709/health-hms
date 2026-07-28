import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listInvoices } from "@/lib/billing";
import { billPatient, recordInvoicePayment, refundInvoicePayment, voidInvoiceAction } from "./actions";
import type { InvoiceStatus, ServiceType } from "@prisma/client";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; serviceType?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;

  const invoices = await listInvoices(tenantId, {
    status: params.status ? (params.status as InvoiceStatus) : undefined,
    serviceType: params.serviceType ? (params.serviceType as ServiceType) : undefined,
  });

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1>Billing</h1>
      <p>
        <Link href="/admin/billing/ledger">View Consolidated Ledger →</Link>
      </p>

      <section style={{ marginTop: 24 }}>
        <h2>Bill Patient</h2>
        <form action={billPatient} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
          <input name="patientEmail" type="email" placeholder="Patient email" required />
          <select name="serviceType" required>
            <option value="CONSULTATION">Consultation</option>
            <option value="LAB">Lab</option>
            <option value="PHARMACY">Pharmacy</option>
          </select>
          <input name="description" placeholder="Description" required />
          <input name="unitPrice" type="number" step="0.01" placeholder="Amount" required />
          <input name="quantity" type="number" defaultValue={1} min={1} />
          <button type="submit">Create invoice</button>
        </form>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Invoices</h2>
        <form method="get" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <select name="status" defaultValue={params.status ?? ""}>
            <option value="">All statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
            <option value="VOID">Void</option>
          </select>
          <select name="serviceType" defaultValue={params.serviceType ?? ""}>
            <option value="">All types</option>
            <option value="CONSULTATION">Consultation</option>
            <option value="LAB">Lab</option>
            <option value="PHARMACY">Pharmacy</option>
          </select>
          <button type="submit">Filter</button>
        </form>

        {invoices.length === 0 && <p>No invoices yet.</p>}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {invoices.map((inv) => (
            <li key={inv.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div>
                <b>{inv.invoiceNumber}</b> — {inv.patient.user.name} — {inv.serviceType}
              </div>
              <div>
                Total: {Number(inv.totalAmount).toFixed(2)} · Paid: {Number(inv.amountPaid).toFixed(2)} · Status:{" "}
                {inv.status}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <form action={recordInvoicePayment} style={{ display: "flex", gap: 4 }}>
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <input name="amount" type="number" step="0.01" placeholder="Amount" style={{ width: 90 }} required />
                  <select name="mode" required>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="RAZORPAY">Razorpay</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <button type="submit">Record payment</button>
                </form>
                <form action={refundInvoicePayment} style={{ display: "flex", gap: 4 }}>
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <input name="amount" type="number" step="0.01" placeholder="Amount" style={{ width: 90 }} required />
                  <input name="reason" placeholder="Reason" style={{ width: 100 }} />
                  <button type="submit">Refund</button>
                </form>
                <form action={voidInvoiceAction}>
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <button type="submit">Void</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
