import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { getConsolidatedLedger, type LedgerSource } from "@/lib/billing";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Consolidated Ledger",
};

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; source?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;

  const ledger = await getConsolidatedLedger(tenantId, {
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(`${params.to}T23:59:59`) : undefined,
    source: params.source ? (params.source as LedgerSource) : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/billing" className="text-sm font-medium text-primary hover:underline">
          ← Back to Billing
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Consolidated Ledger</h1>
        <p className="text-sm text-muted-foreground">Consultation + pharmacy + lab + manual — one daybook.</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Input name="from" type="date" defaultValue={params.from ?? ""} className="w-40" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Input name="to" type="date" defaultValue={params.to ?? ""} className="w-40" />
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
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-semibold">{ledger.totals.invoiceCount}</p>
          <p className="text-xs text-muted-foreground">Invoices</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-semibold">{formatINR(ledger.totals.taxable)}</p>
          <p className="text-xs text-muted-foreground">Taxable</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-semibold">{formatINR(ledger.totals.cgst)}</p>
          <p className="text-xs text-muted-foreground">CGST</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-semibold">{formatINR(ledger.totals.sgst)}</p>
          <p className="text-xs text-muted-foreground">SGST</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-semibold">{formatINR(ledger.totals.total)}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
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
            <p className="text-sm text-muted-foreground">No ledger entries in this range.</p>
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
    </div>
  );
}
