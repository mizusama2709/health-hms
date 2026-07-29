import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAppointmentForCalendar } from "@/lib/appointments";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

function formatDateParam(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DoctorCalendar({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;
  const tenantId = session!.user.tenantId!;

  const doctor = await db.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">No doctor profile linked to this account.</p>
      </div>
    );
  }

  const day = date ? new Date(date) : new Date();
  const prev = new Date(day);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);

  const appointments = await getAppointmentForCalendar(doctor.id, tenantId, day);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Calendar</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/doctor/calendar?date=${formatDateParam(prev)}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              ← Prev
            </Link>
            <CardTitle>{day.toDateString()}</CardTitle>
            <Link href={`/doctor/calendar?date=${formatDateParam(next)}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Next →
            </Link>
          </div>
          <Link href="/doctor" className="text-sm font-medium text-primary hover:underline">
            Back to schedule
          </Link>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments on this day.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {appointments.map((appt) => (
                <li key={appt.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <span className="font-medium">
                      {new Date(appt.datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-sm text-muted-foreground"> — {appt.patient.user.name}</span>
                    <div className="text-sm text-muted-foreground">Type: {appt.type}</div>
                  </div>
                  <StatusBadge status={appt.status} type="appointment" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
