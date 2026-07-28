import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listInvoices } from "@/lib/billing";
import { billPatient, recordInvoicePayment, refundInvoicePayment, voidInvoiceAction } from "./actions";
import type { InvoiceStatus, ServiceType } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; serviceType?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;

  const invoices = await listInvoices(tenantId, {
    status: params.status ? (params.status as InvoiceStatus) : undefined,
    serviceType: params.serviceType ? (params.serviceType as ServiceType) : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <Link href="/admin/billing/ledger" className="text-sm font-medium text-primary hover:underline">
          View Consolidated Ledger →
        </Link>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Bill Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={billPatient} className="flex flex-col gap-2">
            <Label htmlFor="patientEmail">Patient email</Label>
            <Input id="patientEmail" name="patientEmail" type="email" placeholder="Patient email" required />
            <Label htmlFor="serviceType">Service type</Label>
            <NativeSelect id="serviceType" name="serviceType" required>
              <option value="CONSULTATION">Consultation</option>
              <option value="LAB">Lab</option>
              <option value="PHARMACY">Pharmacy</option>
            </NativeSelect>
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="Description" required />
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="unitPrice">Amount</Label>
                <Input id="unitPrice" name="unitPrice" type="number" step="0.01" placeholder="Amount" required />
              </div>
              <div className="flex w-24 flex-col gap-2">
                <Label htmlFor="quantity">Qty</Label>
                <Input id="quantity" name="quantity" type="number" defaultValue={1} min={1} />
              </div>
            </div>
            <Button type="submit" className="mt-2">
              Create invoice
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap gap-2">
            <NativeSelect name="status" defaultValue={params.status ?? ""} className="w-44">
              <option value="">All statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially paid</option>
              <option value="PAID">Paid</option>
              <option value="VOID">Void</option>
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

          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.patient.user.name}</TableCell>
                    <TableCell>{inv.serviceType}</TableCell>
                    <TableCell>{Number(inv.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>{Number(inv.amountPaid).toFixed(2)}</TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} type="invoice" />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <form action={recordInvoicePayment} className="flex items-center gap-1">
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <Input name="amount" type="number" step="0.01" placeholder="Amt" className="w-16" required />
                          <NativeSelect name="mode" required className="w-24">
                            <option value="CASH">Cash</option>
                            <option value="CARD">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="RAZORPAY">Razorpay</option>
                            <option value="OTHER">Other</option>
                          </NativeSelect>
                          <Button type="submit" size="sm" variant="outline">
                            Pay
                          </Button>
                        </form>
                        <form action={refundInvoicePayment} className="flex items-center gap-1">
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <Input name="amount" type="number" step="0.01" placeholder="Amt" className="w-16" required />
                          <Input name="reason" placeholder="Reason" className="w-24" />
                          <Button type="submit" size="sm" variant="outline">
                            Refund
                          </Button>
                        </form>
                        <form action={voidInvoiceAction}>
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Void
                          </Button>
                        </form>
                      </div>
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
