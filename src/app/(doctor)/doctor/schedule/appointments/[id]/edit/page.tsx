import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAppointmentDetailed } from "@/lib/appointments";
import { editAppointmentAction } from "../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
  const session = await auth();
  const tenantId = session!.user.tenantId!;
  const doctor = await db.doctor.findUnique({ where: { userId: session!.user.id } });
  if (!doctor) notFound();

  const appointment = await getAppointmentDetailed(id, tenantId, doctor.id);
  if (!appointment) notFound();

  async function save(formData: FormData) {
    "use server";
    await editAppointmentAction(formData);
    redirect("/doctor/schedule/appointments");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/doctor/schedule/appointments" className="text-sm font-medium text-primary hover:underline">
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
          <form action={save} className="flex flex-col gap-3">
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
