import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantId } from "@/lib/tenant";
import { getInvoiceWithBalance } from "@/lib/billing";
import { db } from "@/lib/db";
import { recordInvoicePayment, refundInvoicePayment } from "../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { StatusBadge } from "@/components/status-badge";

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await requireTenantId();

  const invoice = await getInvoiceWithBalance(id, tenantId);
  if (!invoice) notFound();

  const patient = await db.patient.findUnique({ where: { id: invoice.patientId }, include: { user: true } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/billing/invoices" className="text-sm font-medium text-primary hover:underline">
          ← Back to invoices
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{invoice.invoiceNumber}</h1>
        <p className="text-sm text-muted-foreground">{patient?.user.name}</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {invoice.serviceType} <StatusBadge status={invoice.status} type="invoice" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {invoice.lineItems.map((li) => (
            <div key={li.id} className="flex items-center justify-between">
              <span>
                {li.description} × {li.quantity}
              </span>
              <span>{formatINR(Number(li.lineTotal))}</span>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between border-t pt-2 text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatINR(Number(invoice.subtotal))}</span>
          </div>
          {(Number(invoice.cgstAmount) > 0 || Number(invoice.sgstAmount) > 0) && (
            <>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>CGST</span>
                <span>{formatINR(Number(invoice.cgstAmount))}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>SGST</span>
                <span>{formatINR(Number(invoice.sgstAmount))}</span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between border-t pt-2 font-medium">
            <span>Total</span>
            <span>{formatINR(Number(invoice.totalAmount))}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Paid</span>
            <span>{formatINR(Number(invoice.amountPaid))}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Balance due</span>
            <span>{formatINR(invoice.balanceDue)}</span>
          </div>
        </CardContent>
      </Card>

      {invoice.status !== "VOID" && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Record a payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={recordInvoicePayment} className="flex items-end gap-2">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <div className="flex flex-col gap-1">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" name="amount" type="number" step="0.01" className="w-32" required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="mode">Mode</Label>
                <NativeSelect id="mode" name="mode" required className="w-32">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="RAZORPAY">Razorpay</option>
                  <option value="OTHER">Other</option>
                </NativeSelect>
              </div>
              <Button type="submit">Record</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {Number(invoice.amountPaid) > 0 && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Issue a refund</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={refundInvoicePayment} className="flex items-end gap-2">
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <div className="flex flex-col gap-1">
                <Label htmlFor="refundAmount">Amount</Label>
                <Input id="refundAmount" name="amount" type="number" step="0.01" className="w-32" required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="reason">Reason</Label>
                <Input id="reason" name="reason" className="w-40" />
              </div>
              <Button type="submit" variant="outline">
                Refund
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
