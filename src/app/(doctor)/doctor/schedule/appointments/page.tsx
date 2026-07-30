import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listAppointmentsForDoctor } from "@/lib/appointments";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";

export default async function DoctorAppointmentsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const tenantId = session!.user.tenantId!;

  const doctor = await db.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Appointments</h1>
        <p className="text-sm text-muted-foreground">No doctor profile linked to this account.</p>
      </div>
    );
  }

  const appointments = await listAppointmentsForDoctor(doctor.id, tenantId);
  const upcoming = appointments.filter((a) => new Date(a.datetime) >= new Date() && a.status === "BOOKED");
  const past = appointments.filter((a) => !upcoming.includes(a));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Appointments</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming ({upcoming.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date &amp; time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.patient.user.name}</TableCell>
                    <TableCell>{new Date(a.datetime).toLocaleString()}</TableCell>
                    <TableCell>{a.type}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} type="appointment" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History ({past.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground">No past appointments.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date &amp; time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...past].reverse().map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.patient.user.name}</TableCell>
                    <TableCell>{new Date(a.datetime).toLocaleString()}</TableCell>
                    <TableCell>{a.type}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} type="appointment" />
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
