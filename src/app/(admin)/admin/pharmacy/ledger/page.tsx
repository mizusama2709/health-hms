import Link from "next/link";
import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requireTenantId } from "@/lib/tenant";
import { getConsolidatedLedger } from "@/lib/billing";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export const metadata = {
  title: "Pharmacy Sales Ledger",
};

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PharmacySalesLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const ledger = await getConsolidatedLedger(tenantId, { source: "PHARMACY", page, pageSize: 50 });

  function pageHref(p: number) {
    return `/admin/pharmacy/ledger?page=${p}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Sales Ledger</h1>

      <Card>
        <CardHeader>
          <CardTitle>Entries ({ledger.total})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {ledger.rows.length === 0 ? (
            <EmptyState icon={Receipt} message={<>No pharmacy sales entries yet.</>} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.date.toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{r.invoiceNumber}</TableCell>
                      <TableCell>{formatINR(r.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
