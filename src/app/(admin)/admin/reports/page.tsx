import { requireTenantId } from "@/lib/tenant";
import { getMasterReport, listTransactions, getSelfEfficacyReport } from "@/lib/reports";
import { listDoctorsForTenant } from "@/lib/appointments";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; doctorId?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;

  const filters = {
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(params.to) : undefined,
    doctorId: params.doctorId || undefined,
  };

  const [master, transactions, selfEfficacy, doctors] = await Promise.all([
    getMasterReport(tenantId, filters),
    listTransactions(tenantId, { from: filters.from, to: filters.to }),
    getSelfEfficacyReport(tenantId, filters),
    listDoctorsForTenant(tenantId),
  ]);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto" }}>
      <h1>Reports</h1>

      <form method="get" style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <input name="from" type="date" defaultValue={params.from ?? ""} />
        <input name="to" type="date" defaultValue={params.to ?? ""} />
        <select name="doctorId" defaultValue={params.doctorId ?? ""}>
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.user.name}
            </option>
          ))}
        </select>
        <button type="submit">Filter</button>
      </form>

      <section style={{ marginTop: 16 }}>
        <h2>Master Report</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {Object.entries(master).map(([key, value]) => (
            <div key={key} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{key}</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Transactions</h2>
        {transactions.length === 0 && <p>No transactions in this range.</p>}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {transactions.map((t) => (
            <li key={t.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}>
              {t.paidAt.toLocaleString()} — {Number(t.amount).toFixed(2)} — {t.mode} — {t.status} —{" "}
              {t.invoice.invoiceNumber} ({t.invoice.patient.user.name})
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Self-Efficacy (Patient Journey)</h2>
        <p style={{ fontSize: 13, opacity: 0.7 }}>
          {selfEfficacy.appointmentsConsidered} appointment(s) considered in range.
        </p>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }}>Transition</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }}>Avg minutes</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }}>Sample size</th>
            </tr>
          </thead>
          <tbody>
            {selfEfficacy.transitions.map((t) => (
              <tr key={`${t.from}-${t.to}`}>
                <td style={{ padding: 6 }}>
                  {t.from} → {t.to}
                </td>
                <td style={{ padding: 6 }}>{t.avgMinutes !== null ? t.avgMinutes.toFixed(1) : "—"}</td>
                <td style={{ padding: 6 }}>{t.sampleSize}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
