import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listFollowUps } from "@/lib/followUps";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Reminders",
};

export default async function DoctorRemindersPage() {
  const session = await auth();
  const userId = session!.user.id;
  const tenantId = session!.user.tenantId!;

  const doctor = await db.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Reminders</h1>
        <p className="text-sm text-muted-foreground">No doctor profile linked to this account.</p>
      </div>
    );
  }

  const followUps = await listFollowUps(tenantId, { doctorId: doctor.id });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Reminders</h1>

      <Card>
        <CardHeader>
          <CardTitle>Follow-ups ({followUps.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No follow-ups yet — prescribe one when completing a visit if you&apos;d like a nurse to check in with the patient.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>What to check</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reminder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.appointment.patient.user.name}</TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">{f.focusInstructions}</TableCell>
                    <TableCell>{f.dueDate.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={f.status === "PENDING" ? "outline" : "secondary"}>{f.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {f.reminderScheduled ? (
                        <div className="text-sm">
                          <div>{f.reminderAt?.toLocaleString()}</div>
                          <div className="text-muted-foreground">{f.reminderMessage}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not scheduled</span>
                      )}
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
