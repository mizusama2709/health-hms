import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listInvoicesDetailed, type InvoiceQuickFilter } from "@/lib/billing";
import { markInvoicePaidAction, voidInvoiceAction } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Invoices",
};

const FILTERS: { value: InvoiceQuickFilter | ""; label: string }[] = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "", label: "All" },
  { value: "CONSULTATION", label: "Consultation" },
  { value: "PHARMACY", label: "Pharmacy" },
  { value: "LAB", label: "Lab" },
  { value: "MANUAL", label: "Manual" },
];

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; from?: string; to?: string; filter?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const filter = (params.filter || undefined) as InvoiceQuickFilter | undefined;

  const invoices = await listInvoicesDetailed(tenantId, {
    search: params.search,
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(`${params.to}T23:59:59`) : undefined,
    filter,
  });

  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  function filterUrl(value: string) {
    const q = new URLSearchParams(query);
    if (value) q.set("filter", value);
    else q.delete("filter");
    return `/admin/billing/invoices?${q.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <p className="text-sm text-muted-foreground">Every invoice — consultation, pharmacy, lab &amp; manual — in one place.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            href={filterUrl(f.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              (filter ?? "") === f.value ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        {params.filter && <input type="hidden" name="filter" value={params.filter} />}
        <div className="flex flex-1 min-w-[220px] flex-col gap-1">
          <span className="text-xs text-muted-foreground">Search name, phone or patient ID</span>
          <Input name="search" defaultValue={params.search ?? ""} placeholder="Ravi Kumar, 9000..., 62583" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Input name="from" type="date" defaultValue={params.from ?? ""} className="w-40" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input name="to" type="date" defaultValue={params.to ?? ""} className="w-40" />
        </div>
        <button type="submit" className="h-9 rounded-lg border px-4 text-sm font-medium hover:bg-muted">
          Apply
        </button>
      </form>

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices match these filters.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {invoices.map((inv) => {
            const balanceDue = Number(inv.totalAmount) - Number(inv.amountPaid);
            const doctor = inv.appointment?.doctor;
            return (
              <Card key={inv.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{inv.invoiceNumber}</span>
                      <Badge variant="outline">{inv.serviceType}</Badge>
                      <StatusBadge status={inv.status} type="invoice" />
                      {inv.source === "MANUAL" && <Badge variant="secondary">Manual</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {inv.patient.user.name}
                      {doctor ? ` — with Dr. ${doctor.user.name}` : ""} · {inv.createdAt.toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">{formatINR(Number(inv.totalAmount))}</div>
                      {balanceDue > 0 && inv.status !== "VOID" && (
                        <div className="text-xs text-amber-600">{formatINR(balanceDue)} due</div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Link href={`/admin/billing/invoices/${inv.id}`} className="rounded-lg border px-3 py-1.5 font-medium hover:bg-muted">
                        View
                      </Link>
                      {inv.status !== "VOID" && (
                        <Link
                          href={`/admin/billing/invoices/${inv.id}/edit`}
                          className="rounded-lg border px-3 py-1.5 font-medium hover:bg-muted"
                        >
                          Edit
                        </Link>
                      )}
                      {inv.status !== "PAID" && inv.status !== "VOID" && (
                        <form action={markInvoicePaidAction.bind(null, inv.id)}>
                          <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90">
                            Mark paid
                          </button>
                        </form>
                      )}
                      {inv.status !== "VOID" && (
                        <form action={voidInvoiceAction.bind(null, inv.id)}>
                          <button type="submit" className="rounded-lg border border-destructive/40 px-3 py-1.5 font-medium text-destructive hover:bg-destructive/10">
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
