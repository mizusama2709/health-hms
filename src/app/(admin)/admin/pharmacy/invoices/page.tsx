import { requireTenantId } from "@/lib/tenant";
import { listInvoices } from "@/lib/billing";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";

export default async function PharmacyInvoicesPage() {
  const tenantId = await requireTenantId();
  const invoices = await listInvoices(tenantId, { serviceType: "PHARMACY" });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Pharmacy Invoices</h1>

      <Card>
        <CardHeader>
          <CardTitle>Invoices ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pharmacy invoices yet.</p>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
