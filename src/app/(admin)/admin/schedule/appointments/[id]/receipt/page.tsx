import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { getAppointmentDetailed } from "@/lib/appointments";
import { PrintButton } from "@/components/print-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

export const metadata = {
  title: "Appointment Receipt",
};

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default async function AppointmentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await requireTenantId();

  const appointment = await getAppointmentDetailed(id, tenantId);
  if (!appointment) notFound();

  const invoice = appointment.invoices[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/schedule/appointments" className="text-sm font-medium text-primary hover:underline">
          ← Back to appointments
        </Link>
        <PrintButton />
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Receipt</CardTitle>
          <p className="text-sm text-muted-foreground">{invoice?.invoiceNumber ?? `Appointment ${appointment.id.slice(-6).toUpperCase()}`}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Patient</p>
              <p className="font-medium">{appointment.patient.user.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Doctor</p>
              <p className="font-medium">Dr. {appointment.doctor.user.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Service</p>
              <p className="font-medium">
                {appointment.serviceType} — {appointment.type}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date &amp; time</p>
              <p className="font-medium">{new Date(appointment.datetime).toLocaleString()}</p>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            {invoice ? (
              <div className="flex flex-col gap-2">
                {invoice.lineItems.map((li) => (
                  <div key={li.id} className="flex items-center justify-between">
                    <span>
                      {li.description} × {li.quantity}
                    </span>
                    <span>{formatINR(Number(li.lineTotal))}</span>
                  </div>
                ))}
                {(Number(invoice.cgstAmount) > 0 || Number(invoice.sgstAmount) > 0) && (
                  <>
                    <div className="mt-1 flex items-center justify-between border-t pt-2 text-muted-foreground">
                      <span>CGST</span>
                      <span>{formatINR(Number(invoice.cgstAmount))}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>SGST</span>
                      <span>{formatINR(Number(invoice.sgstAmount))}</span>
                    </div>
                  </>
                )}
                <div className="mt-1 flex items-center justify-between border-t pt-2 font-medium">
                  <span>Total</span>
                  <span>{formatINR(Number(invoice.totalAmount))}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Paid</span>
                  <span>{formatINR(Number(invoice.amountPaid))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={invoice.status} type="invoice" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span>Consultation fee</span>
                <span className="font-medium">{formatINR(Number(appointment.feeAmount ?? 0))}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
