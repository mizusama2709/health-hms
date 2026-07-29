import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { getConsolidatedLedger } from "@/lib/billing";
import type { AppointmentSource, ServiceType } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/billing" className="text-sm font-medium text-primary hover:underline">
          ← Back to Billing
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Consolidated Ledger</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap gap-2">
            <Input name="from" type="date" defaultValue={params.from ?? ""} className="w-40" />
            <Input name="to" type="date" defaultValue={params.to ?? ""} className="w-40" />
            <NativeSelect name="source" defaultValue={params.source ?? ""} className="w-40">
              <option value="">All sources</option>
              <option value="MANUAL">Manual</option>
              <option value="WHATSAPP">WhatsApp</option>
            </NativeSelect>
            <NativeSelect name="serviceType" defaultValue={params.serviceType ?? ""} className="w-44">
              <option value="">All types</option>
              <option value="CONSULTATION">Consultation</option>
              <option value="LAB">Lab</option>
              <option value="PHARMACY">Pharmacy</option>
            </NativeSelect>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>

          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ledger entries in this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Source</TableHead>
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
                    <TableCell>{e.invoice.serviceType}</TableCell>
                    <TableCell>{e.invoice.source}</TableCell>
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
