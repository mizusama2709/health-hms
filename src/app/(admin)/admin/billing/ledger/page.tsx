import Link from "next/link";
import { Receipt, FileText, IndianRupee, Percent, Landmark, Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requireTenantId } from "@/lib/tenant";
import { getConsolidatedLedger, type LedgerSource } from "@/lib/billing";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangePresets } from "@/components/date-range-presets";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/stat-tile";

export const metadata = {
  title: "Consolidated Ledger",
};

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; source?: string; page?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const ledger = await getConsolidatedLedger(tenantId, {
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(`${params.to}T23:59:59`) : undefined,
    source: params.source ? (params.source as LedgerSource) : undefined,
    page,
    pageSize: 50,
  });

  function pageHref(p: number) {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.source) q.set("source", params.source);
    q.set("page", String(p));
    return `/admin/billing/ledger?${q.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Consolidated Ledger</h1>
        <p className="text-sm text-muted-foreground">Consultation + pharmacy + lab + manual — one daybook.</p>
      </div>

      <DateRangePresets
        basePath="/admin/billing/ledger"
        otherParams={{ source: params.source }}
        activeFrom={params.from}
        activeTo={params.to}
      />

      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">From</span>
          <DatePicker name="from" defaultValue={params.from} placeholder="From" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">To</span>
          <DatePicker name="to" defaultValue={params.to} placeholder="To" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Source</span>
          <NativeSelect name="source" defaultValue={params.source ?? ""} className="w-44">
            <option value="">All sources</option>
            <option value="CONSULTATION">Consultation</option>
            <option value="PHARMACY">Pharmacy</option>
            <option value="LAB">Lab</option>
            <option value="MANUAL">Manual</option>
          </NativeSelect>
        </div>
        <button type="submit" className="h-9 rounded-lg border px-4 text-sm font-medium hover:bg-muted">
          Filter
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Invoices" value={ledger.totals.invoiceCount} icon={FileText} iconColor="blue" />
        <StatTile label="Taxable" value={formatINR(ledger.totals.taxable)} icon={IndianRupee} iconColor="violet" />
        <StatTile label="CGST" value={formatINR(ledger.totals.cgst)} icon={Percent} iconColor="amber" />
        <StatTile label="SGST" value={formatINR(ledger.totals.sgst)} icon={Landmark} iconColor="amber" />
        <StatTile
          label="Total"
          value={formatINR(ledger.totals.total)}
          icon={Wallet}
          iconColor="emerald"
          valueClassName="text-emerald-400"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["CONSULTATION", "PHARMACY", "LAB", "MANUAL"] as LedgerSource[]).map((s) => (
          <Badge key={s} variant="outline" className="px-3 py-1.5 text-xs">
            {s.charAt(0) + s.slice(1).toLowerCase()}: {formatINR(ledger.bySource[s].total)} ({ledger.bySource[s].count})
          </Badge>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {ledger.rows.length === 0 ? (
            <EmptyState icon={Receipt} message={<>No ledger entries in this range.</>} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Taxable</TableHead>
                  <TableHead>CGST</TableHead>
                  <TableHead>SGST</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date.toLocaleDateString()}</TableCell>
                    <TableCell>{r.source.charAt(0) + r.source.slice(1).toLowerCase()}</TableCell>
                    <TableCell className="font-medium">{r.invoiceNumber}</TableCell>
                    <TableCell>{formatINR(r.taxable)}</TableCell>
                    <TableCell>{formatINR(r.cgst)}</TableCell>
                    <TableCell>{formatINR(r.sgst)}</TableCell>
                    <TableCell className="font-medium">{formatINR(r.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {ledger.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {ledger.totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="font-medium text-primary hover:underline">
                ← Previous
              </Link>
            )}
            {page < ledger.totalPages && (
              <Link href={pageHref(page + 1)} className="font-medium text-primary hover:underline">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
