import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listAppointmentsForTenant } from "@/lib/appointments";
import { listStaff } from "@/lib/staff";
import { QUEUE_STAGES, listStageConfigs, getStageEntriesForAppointments } from "@/lib/queueStages";
import { startStageAction, completeStageAction } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import type { QueueStage } from "@prisma/client";

const STAGE_LABELS: Record<QueueStage, string> = {
  REGISTRATION: "Registration",
  VITALS: "Vitals",
  CONSULTATION: "Consultation",
  LAB: "Lab",
  CONSULTATION_2: "Consultation 2",
  PHARMACY: "Pharmacy",
};

function formatElapsed(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default async function QueuePage() {
  const tenantId = await requireTenantId();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [appointments, staff, stageConfigs] = await Promise.all([
    listAppointmentsForTenant(tenantId, { from: todayStart, to: todayEnd }),
    listStaff(tenantId),
    listStageConfigs(tenantId),
  ]);

  const entriesByAppointment = await getStageEntriesForAppointments(
    appointments.map((a) => a.id),
    tenantId
  );

  const now = new Date().getTime();

  const stageCounts: Record<QueueStage, number> = {
    REGISTRATION: 0,
    VITALS: 0,
    CONSULTATION: 0,
    LAB: 0,
    CONSULTATION_2: 0,
    PHARMACY: 0,
  };
  let completedAllCount = 0;

  const currentStageByAppointment = new Map<string, QueueStage | null>();
  for (const appt of appointments) {
    const stages = entriesByAppointment.get(appt.id);
    const currentStage = QUEUE_STAGES.find((stage) => !stages?.get(stage)?.completedAt) ?? null;
    currentStageByAppointment.set(appt.id, currentStage);
    if (currentStage) {
      stageCounts[currentStage] += 1;
    } else {
      completedAllCount += 1;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Queue — Live patient tracker</h1>
          <p className="text-sm text-muted-foreground">
            Where each patient is right now, across every stage of the visit. A stage turns red when it exceeds its
            turnaround time.
          </p>
        </div>
        <Link href="/admin/queue/configure" className="text-sm font-medium text-primary hover:underline">
          Configure flow
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        {QUEUE_STAGES.map((stage) => (
          <Card key={stage}>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold">{stageCounts[stage]}</div>
              <div className="text-xs text-muted-foreground">{STAGE_LABELS[stage]}</div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">{completedAllCount}</div>
            <div className="text-xs text-muted-foreground">Completed all stages</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today — {todayStart.toDateString()} · {appointments.length} patients</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments scheduled today.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  {QUEUE_STAGES.map((stage) => (
                    <TableHead key={stage}>{STAGE_LABELS[stage]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => {
                  const stages = entriesByAppointment.get(appt.id);
                  const currentStage = currentStageByAppointment.get(appt.id);

                  return (
                    <TableRow key={appt.id}>
                      <TableCell className="font-medium">
                        {appt.patient.user.name}
                        <div className="text-xs text-muted-foreground">
                          {new Date(appt.datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </TableCell>
                      <TableCell>Dr. {appt.doctor.user.name}</TableCell>
                      {QUEUE_STAGES.map((stage) => {
                        const entry = stages?.get(stage);
                        const turnaround = stageConfigs[stage];

                        if (entry?.completedAt) {
                          const durationMs = entry.completedAt.getTime() - entry.startedAt.getTime();
                          return (
                            <TableCell key={stage} className="text-xs">
                              <span className="text-green-600">✓ {formatElapsed(durationMs)}</span>
                            </TableCell>
                          );
                        }

                        if (entry) {
                          const elapsedMs = now - entry.startedAt.getTime();
                          const overdue = elapsedMs > turnaround * 60000;
                          return (
                            <TableCell key={stage} className="text-xs">
                              <div className={overdue ? "text-destructive font-medium" : ""}>
                                {entry.assignedTo?.name ?? "Unassigned"} · {formatElapsed(elapsedMs)}
                              </div>
                              <form action={completeStageAction} className="mt-1">
                                <input type="hidden" name="entryId" value={entry.id} />
                                <Button type="submit" size="sm" variant="outline">
                                  Complete
                                </Button>
                              </form>
                              {stage === "VITALS" && (
                                <Link
                                  href={`/admin/queue/${appt.id}/vitals`}
                                  className="mt-1 block text-primary hover:underline"
                                >
                                  Record vitals →
                                </Link>
                              )}
                            </TableCell>
                          );
                        }

                        if (stage === currentStage) {
                          return (
                            <TableCell key={stage} className="text-xs">
                              <form action={startStageAction} className="flex flex-col gap-1">
                                <input type="hidden" name="appointmentId" value={appt.id} />
                                <input type="hidden" name="stage" value={stage} />
                                <NativeSelect name="assignedToId" className="h-7 text-xs">
                                  <option value="">Assign to me</option>
                                  {staff.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </NativeSelect>
                                <Button type="submit" size="sm" variant="outline">
                                  Start
                                </Button>
                              </form>
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell key={stage} className="text-xs text-muted-foreground">
                            —
                          </TableCell>
                        );
                      })}
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
