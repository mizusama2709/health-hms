import Link from "next/link";
import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requireTenantId } from "@/lib/tenant";
import { listInvoicesPaged } from "@/lib/billing";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";

export const metadata = {
  title: "Pharmacy Invoices",
};

export default async function PharmacyInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const { invoices, total, totalPages } = await listInvoicesPaged(tenantId, { serviceType: "PHARMACY", page, pageSize: 50 });

  function pageHref(p: number) {
    return `/admin/pharmacy/invoices?page=${p}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Pharmacy Invoices</h1>

      <Card>
        <CardHeader>
          <CardTitle>Invoices ({total})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {invoices.length === 0 ? (
            <EmptyState icon={Receipt} message={<>No pharmacy invoices yet.</>} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.patient.user.name}</TableCell>
                      <TableCell>{Number(inv.totalAmount).toFixed(2)}</TableCell>
                      <TableCell>{Number(inv.amountPaid).toFixed(2)}</TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} type="invoice" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link href={pageHref(page - 1)} className="font-medium text-primary hover:underline">
                        ← Previous
                      </Link>
                    )}
                    {page < totalPages && (
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
