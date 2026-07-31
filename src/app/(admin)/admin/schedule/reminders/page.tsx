import { requireTenantId } from "@/lib/tenant";
import { listFollowUps } from "@/lib/followUps";
import { scheduleReminderAction, markFollowUpStatusAction } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function RemindersPage() {
  const tenantId = await requireTenantId();
  const followUps = await listFollowUps(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Reminders</h1>

      <Card>
        <CardHeader>
          <CardTitle>Follow-ups</CardTitle>
        </CardHeader>
        <CardContent>
          {followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No follow-ups yet — one is created automatically when a doctor marks an appointment Completed.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reminder</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.appointment.patient.user.name}</TableCell>
                    <TableCell>{f.dueDate.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={f.status === "pending" ? "outline" : "secondary"}>{f.status}</Badge>
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
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <form action={scheduleReminderAction} className="flex items-center gap-1">
                          <input type="hidden" name="followUpId" value={f.id} />
                          <Input name="reminderAt" type="datetime-local" className="w-44" required />
                          <Input name="reminderMessage" placeholder="Message" className="w-32" required />
                          <Button type="submit" size="sm" variant="outline">
                            Schedule
                          </Button>
                        </form>
                        <form action={markFollowUpStatusAction} className="flex items-center gap-1">
                          <input type="hidden" name="followUpId" value={f.id} />
                          <NativeSelect name="status" defaultValue={f.status} className="w-32">
                            <option value="pending">Pending</option>
                            <option value="done">Done</option>
                            <option value="cancelled">Cancelled</option>
                          </NativeSelect>
                          <Button type="submit" size="sm" variant="ghost">
                            Save
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
