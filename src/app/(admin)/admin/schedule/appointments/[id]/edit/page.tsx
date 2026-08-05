import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { getAppointmentDetailed } from "@/lib/appointments";
import { editAppointmentActionResult } from "../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";

export const metadata = {
  title: "Edit Appointment",
};

function toDateTimeLocal(d: Date) {
  const dt = new Date(d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 16);
}

export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await requireTenantId();

  const appointment = await getAppointmentDetailed(id, tenantId);
  if (!appointment) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/schedule/appointments" className="text-sm font-medium text-primary hover:underline">
          ← Back to appointments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit appointment</h1>
        <p className="text-sm text-muted-foreground">{appointment.patient.user.name}</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Date, time &amp; fee</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={editAppointmentActionResult} className="flex flex-col gap-3">
            <input type="hidden" name="appointmentId" value={appointment.id} />
            <Label htmlFor="datetime">Date &amp; time</Label>
            <Input id="datetime" name="datetime" type="datetime-local" defaultValue={toDateTimeLocal(appointment.datetime)} required />
            <Label htmlFor="feeAmount">Fee (₹)</Label>
            <Input
              id="feeAmount"
              name="feeAmount"
              type="number"
              step="0.01"
              defaultValue={appointment.feeAmount ? Number(appointment.feeAmount) : ""}
            />
            <Button type="submit" className="mt-2">
              Save changes
            </Button>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
