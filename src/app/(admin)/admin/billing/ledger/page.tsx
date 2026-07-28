import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { getConsolidatedLedger } from "@/lib/billing";
import type { AppointmentSource, ServiceType } from "@prisma/client";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; source?: string; serviceType?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;

  const entries = await getConsolidatedLedger(tenantId, {
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(params.to) : undefined,
    source: params.source ? (params.source as AppointmentSource) : undefined,
    serviceType: params.serviceType ? (params.serviceType as ServiceType) : undefined,
  });

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <p>
        <Link href="/admin/billing">← Back to Billing</Link>
      </p>
      <h1>Consolidated Ledger</h1>

      <form method="get" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input name="from" type="date" defaultValue={params.from ?? ""} />
        <input name="to" type="date" defaultValue={params.to ?? ""} />
        <select name="source" defaultValue={params.source ?? ""}>
          <option value="">All sources</option>
          <option value="MANUAL">Manual</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
        <select name="serviceType" defaultValue={params.serviceType ?? ""}>
          <option value="">All types</option>
          <option value="CONSULTATION">Consultation</option>
          <option value="LAB">Lab</option>
          <option value="PHARMACY">Pharmacy</option>
        </select>
        <button type="submit">Filter</button>
      </form>

      {entries.length === 0 && <p>No ledger entries in this range.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {entries.map((e) => (
          <li
            key={`${e.kind}-${e.id}`}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}
          >
            <div>
              <b>{e.kind}</b> — {e.timestamp.toLocaleString()} — {e.amount.toFixed(2)}
            </div>
            <div>
              {e.invoice.invoiceNumber} · {e.invoice.serviceType} · {e.invoice.source} · patient{" "}
              {e.invoice.patient.user.name}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
