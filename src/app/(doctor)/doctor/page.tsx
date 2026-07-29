import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listAppointmentsForDoctor } from "@/lib/appointments";
import { setAppointmentStatus } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

export default async function DoctorHome() {
  const session = await auth();
  const userId = session!.user.id;
  const tenantId = session!.user.tenantId!;

  const doctor = await db.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Doctor dashboard</h1>
        <p className="text-sm text-muted-foreground">No doctor profile linked to this account.</p>
      </div>
    );
  }

  const appointments = await listAppointmentsForDoctor(doctor.id, tenantId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your schedule</h1>
        <Link href="/doctor/calendar" className="text-sm font-medium text-primary hover:underline">
          Calendar view
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {appointments.map((appt) => (
                <li key={appt.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{appt.patient.user.name}</span>
                      <span className="text-sm text-muted-foreground"> — {new Date(appt.datetime).toLocaleString()}</span>
                    </div>
                    <StatusBadge status={appt.status} type="appointment" />
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">Type: {appt.type}</div>
                  <Link
                    href={`/doctor/${appt.id}/summary`}
                    className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    Co-Pilot summary →
                  </Link>
                  {appt.status === "BOOKED" && (
                    <div className="mt-2 flex gap-2">
                      <form action={async () => { "use server"; await setAppointmentStatus(appt.id, "COMPLETED"); }}>
                        <Button type="submit" size="sm" variant="outline">
                          Mark completed
                        </Button>
                      </form>
                      <form action={async () => { "use server"; await setAppointmentStatus(appt.id, "NO_SHOW"); }}>
                        <Button type="submit" size="sm" variant="outline">
                          Mark no-show
                        </Button>
                      </form>
                      <form action={async () => { "use server"; await setAppointmentStatus(appt.id, "CANCELLED"); }}>
                        <Button type="submit" size="sm" variant="ghost">
                          Cancel
                        </Button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
