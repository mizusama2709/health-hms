import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listFollowUps, getFollowUpStats } from "@/lib/followUps";
import { patientDisplayId } from "@/lib/patients";
import { scheduleReminderAction, logFollowUpCallActionResult, cancelFollowUpActionResult } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/action-form";
import type { FollowUpStatus } from "@prisma/client";

export const metadata = {
  title: "Follow-ups",
};

const STATUS_BADGE: Record<FollowUpStatus, "outline" | "default" | "destructive" | "secondary"> = {
  PENDING: "outline",
  COMPLETED: "default",
  ESCALATED: "destructive",
  CANCELLED: "secondary",
};

const OUTCOME_LABELS: Record<string, string> = {
  IMPROVING: "Improving",
  NO_CHANGE: "No change",
  WORSENING: "Worsening",
  ADVERSE_REACTION: "Adverse reaction",
  RESOLVED: "Resolved",
  UNREACHABLE: "Unreachable",
};

const NEXT_ACTION_LABELS: Record<string, string> = {
  NONE: "None — closing this follow-up",
  ANOTHER_CALL_SCHEDULED: "Schedule another call",
  BOOK_APPOINTMENT: "Book a follow-up appointment",
  ESCALATE_TO_DOCTOR: "Escalate to the doctor",
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const status = (["PENDING", "COMPLETED", "ESCALATED", "CANCELLED"].includes(params.status ?? "")
    ? params.status
    : undefined) as FollowUpStatus | undefined;

  const [followUps, stats] = await Promise.all([listFollowUps(tenantId, { status }), getFollowUpStats(tenantId)]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Follow-ups</h1>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending</p>
          <p className="mt-1 text-xl font-semibold">{stats.pending}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Overdue</p>
          <p className="mt-1 text-xl font-semibold text-destructive">{stats.overdue}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed this month</p>
          <p className="mt-1 text-xl font-semibold">{stats.completedThisMonth}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Escalated</p>
          <p className="mt-1 text-xl font-semibold">{stats.escalated}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Follow-up calls ({followUps.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Status</span>
              <NativeSelect name="status" defaultValue={status ?? ""} className="w-48">
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="ESCALATED">Escalated</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">
              Apply
            </Button>
            {status && (
              <Link href="/admin/schedule/reminders" className="text-sm text-muted-foreground hover:underline">
                Clear
              </Link>
            )}
          </form>

          {followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No follow-ups match this filter — a follow-up only appears here when a doctor prescribes one while
              completing a visit.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {followUps.map((f) => {
                const patient = f.appointment.patient;
                const doctor = f.appointment.doctor;
                const visitRecord = f.appointment.visitRecord;
                const prescribedMedicines = f.appointment.prescriptions.flatMap((p) =>
                  p.items.map((i) => `${i.medicine.name} x${i.quantity}`)
                );
                const isOverdue = f.isOverdue;

                return (
                  <div key={f.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link href={`/admin/patients/${patient.id}`} className="font-medium text-primary hover:underline">
                          {patient.user.name}
                        </Link>
                        <span className="text-sm text-muted-foreground"> · {patientDisplayId(patient.id)}</span>
                        {patient.user.phone && (
                          <span className="text-sm text-muted-foreground"> · {patient.user.phone}</span>
                        )}
                        <div className="text-sm text-muted-foreground">
                          Seen by Dr. {doctor.user.name} on {formatDate(f.appointment.datetime)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                        <Badge variant={STATUS_BADGE[f.status]}>{f.status}</Badge>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md bg-muted p-2 text-sm">
                        <div className="font-medium">Diagnosis</div>
                        <div className="text-muted-foreground">{visitRecord?.diagnosis || "Not recorded"}</div>
                        <div className="mt-2 font-medium">Treatment plan</div>
                        <div className="text-muted-foreground">
                          {visitRecord?.prescription || "Not recorded"}
                          {prescribedMedicines.length > 0 && (
                            <div className="mt-1">Prescribed: {prescribedMedicines.join(", ")}</div>
                          )}
                        </div>
                      </div>
                      <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-sm">
                        <div className="font-medium">What to check</div>
                        <div className="text-muted-foreground">{f.focusInstructions}</div>
                        <div className="mt-2 font-medium">Due</div>
                        <div className="text-muted-foreground">{formatDate(f.dueDate)}</div>
                      </div>
                    </div>

                    {f.linkedLabOrders.length > 0 && (
                      <div className="mt-3 rounded-md border p-2 text-sm">
                        <div className="font-medium">Tests expected for this call</div>
                        <ul className="mt-1 flex flex-col gap-1">
                          {f.linkedLabOrders.map((order) => (
                            <li key={order.id} className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                {order.items.map((i) => i.labTest.name).join(", ")}
                              </span>
                              <Badge variant={order.status === "COMPLETED" ? "default" : "outline"}>
                                {order.status === "COMPLETED" ? "Results in" : "Not ready yet"}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {f.callLogs.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium text-primary">
                          Call history ({f.callLogs.length})
                        </summary>
                        <ul className="mt-2 flex flex-col gap-2">
                          {f.callLogs.map((log) => (
                            <li key={log.id} className="rounded-md border p-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{OUTCOME_LABELS[log.outcome] ?? log.outcome}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(log.calledAt).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-muted-foreground">{log.notes}</div>
                              <div className="text-xs text-muted-foreground">
                                Next: {NEXT_ACTION_LABELS[log.nextAction] ?? log.nextAction}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {(f.status === "PENDING" || f.status === "ESCALATED") && (
                      <ActionForm
                        action={logFollowUpCallActionResult}
                        className="mt-3 flex flex-col gap-2 rounded-md border bg-muted/30 p-3"
                      >
                        <input type="hidden" name="followUpId" value={f.id} />
                        <p className="text-sm font-medium">Log call outcome</p>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`outcome-${f.id}`}>Outcome</Label>
                            <NativeSelect id={`outcome-${f.id}`} name="outcome" required className="w-44">
                              <option value="IMPROVING">Improving</option>
                              <option value="NO_CHANGE">No change</option>
                              <option value="WORSENING">Worsening</option>
                              <option value="ADVERSE_REACTION">Adverse reaction</option>
                              <option value="RESOLVED">Resolved</option>
                              <option value="UNREACHABLE">Unreachable</option>
                            </NativeSelect>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`nextAction-${f.id}`}>Next action</Label>
                            <NativeSelect id={`nextAction-${f.id}`} name="nextAction" required className="w-52">
                              <option value="NONE">None — close this follow-up</option>
                              <option value="ANOTHER_CALL_SCHEDULED">Schedule another call</option>
                              <option value="BOOK_APPOINTMENT">Book a follow-up appointment</option>
                              <option value="ESCALATE_TO_DOCTOR">Escalate to the doctor</option>
                            </NativeSelect>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`nextFollowUpAt-${f.id}`}>Next call date (if scheduling another)</Label>
                            <Input id={`nextFollowUpAt-${f.id}`} name="nextFollowUpAt" type="date" className="w-44" />
                          </div>
                        </div>
                        <Label htmlFor={`notes-${f.id}`}>What did the patient say?</Label>
                        <Input id={`notes-${f.id}`} name="notes" required placeholder="Call notes" />
                        <Button type="submit" size="sm" className="mt-1 self-start">
                          Save call outcome
                        </Button>
                      </ActionForm>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <form action={scheduleReminderAction} className="flex flex-wrap items-center gap-1.5">
                        <input type="hidden" name="followUpId" value={f.id} />
                        <Input name="reminderAt" type="datetime-local" className="w-44" required />
                        <Input name="reminderMessage" placeholder="WhatsApp reminder message" className="w-52" required />
                        <Button type="submit" size="sm" variant="outline">
                          Schedule reminder
                        </Button>
                      </form>
                      {f.reminderScheduled && (
                        <span className="text-xs text-muted-foreground">
                          Reminder set for {f.reminderAt && new Date(f.reminderAt).toLocaleString()}
                        </span>
                      )}
                      {(f.status === "PENDING" || f.status === "ESCALATED") && (
                        <ActionForm
                          action={cancelFollowUpActionResult}
                          confirmMessage="Cancel this follow-up? This cannot be undone."
                        >
                          <input type="hidden" name="followUpId" value={f.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Cancel follow-up
                          </Button>
                        </ActionForm>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
