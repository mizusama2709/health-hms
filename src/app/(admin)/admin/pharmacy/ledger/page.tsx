import { requireTenantId } from "@/lib/tenant";
import { getConsolidatedLedger } from "@/lib/billing";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function PharmacySalesLedgerPage() {
  const tenantId = await requireTenantId();
  const entries = await getConsolidatedLedger(tenantId, { serviceType: "PHARMACY" });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Sales Ledger</h1>

      <Card>
        <CardHeader>
          <CardTitle>Entries ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pharmacy sales entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Patient</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={`${e.kind}-${e.id}`}>
                    <TableCell>
                      <Badge variant={e.kind === "PAYMENT" ? "default" : "destructive"}>{e.kind}</Badge>
                    </TableCell>
                    <TableCell>{e.timestamp.toLocaleString()}</TableCell>
                    <TableCell>{e.amount.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">{e.invoice.invoiceNumber}</TableCell>
                    <TableCell>{e.invoice.patient.user.name}</TableCell>
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
