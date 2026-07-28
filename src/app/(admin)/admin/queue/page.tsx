import { requireTenantId } from "@/lib/tenant";
import { listAppointmentsForTenant } from "@/lib/appointments";
import { getLatestJourneyStepsForAppointments } from "@/lib/journey";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";

const STEP_LABELS: Record<string, string> = {
  APPOINTMENT_BOOKED: "Booked",
  VITALS_TAKEN: "Vitals taken",
  OPD_STARTED: "In consultation",
  OPD_COMPLETED: "Consultation done",
  LAB_ORDERED: "Lab ordered",
  LAB_COMPLETED: "Lab done",
  MEDICINES_PRESCRIBED: "Prescribed",
  MEDICINES_DISPENSED: "Medicines dispensed",
};

export default async function QueuePage() {
  const tenantId = await requireTenantId();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const appointments = await listAppointmentsForTenant(tenantId, { from: todayStart, to: todayEnd });
  const stepMap = await getLatestJourneyStepsForAppointments(
    appointments.map((a) => a.id),
    tenantId
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Queue</h1>

      <Card>
        <CardHeader>
          <CardTitle>Today — {todayStart.toDateString()}</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments scheduled today.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current step</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => {
                  const step = stepMap.get(appt.id);
                  return (
                    <TableRow key={appt.id}>
                      <TableCell>
                        {new Date(appt.datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="font-medium">{appt.patient.user.name}</TableCell>
                      <TableCell>Dr. {appt.doctor.user.name}</TableCell>
                      <TableCell>
                        <StatusBadge status={appt.status} type="appointment" />
                      </TableCell>
                      <TableCell>
                        {step ? <Badge variant="outline">{STEP_LABELS[step] ?? step}</Badge> : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
