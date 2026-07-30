import { requireTenantId } from "@/lib/tenant";
import { getConsolidatedLedger } from "@/lib/billing";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PharmacySalesLedgerPage() {
  const tenantId = await requireTenantId();
  const ledger = await getConsolidatedLedger(tenantId, { source: "PHARMACY" });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Sales Ledger</h1>

      <Card>
        <CardHeader>
          <CardTitle>Entries ({ledger.rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pharmacy sales entries yet.</p>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
