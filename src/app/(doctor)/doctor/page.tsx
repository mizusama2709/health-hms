import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listAppointmentsForDoctor } from "@/lib/appointments";
import { listLabTests, listLatestCompletedLabOrdersForPatients } from "@/lib/lab";
import { listMedicines } from "@/lib/pharmacy";
import { setAppointmentStatus, completeVisitAction, orderLabTests, prescribeMedicines } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { StatusBadge } from "@/components/status-badge";

export const metadata = {
  title: "Doctor Dashboard",
};

const PRESCRIPTION_ROW_COUNT = 5;

const DOSE_TIMES = [
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
  { value: "EVENING", label: "Evening" },
  { value: "NIGHT", label: "Night" },
] as const;

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

  const [appointments, labTests, medicines] = await Promise.all([
    listAppointmentsForDoctor(doctor.id, tenantId),
    listLabTests(tenantId, { isActive: true }),
    listMedicines(tenantId, { isActive: true }),
  ]);

  const recentLabsByPatient = await listLatestCompletedLabOrdersForPatients(
    tenantId,
    [...new Set(appointments.map((a) => a.patientId))]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your schedule</h1>
        <Link href="/doctor/schedule/calendar" className="text-sm font-medium text-primary hover:underline">
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
              {appointments.map((appt) => {
                const recentLabs = recentLabsByPatient.get(appt.patientId);
                return (
                <li key={appt.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{appt.patient.user.name}</span>
                      <span className="text-sm text-muted-foreground"> — {new Date(appt.datetime).toLocaleString()}</span>
                    </div>
                    <StatusBadge status={appt.status} type="appointment" />
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">Type: {appt.type}</div>
                  {recentLabs && (
                    <div className="mt-2 rounded-md bg-muted p-2 text-sm">
                      <span className="font-medium">Recent labs</span> ({new Date(recentLabs.orderedAt).toLocaleDateString()}):{" "}
                      {recentLabs.items.map((i) => `${i.labTest.name}: ${i.resultValue ?? "—"} ${i.resultUnit ?? ""}`.trim()).join(", ")}
                    </div>
                  )}
                  {appt.status === "BOOKED" && (
                    <div className="mt-2 flex flex-col gap-2">
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-primary">Complete visit</summary>
                        <form action={completeVisitAction} className="mt-2 flex flex-col gap-2 rounded-md border p-2">
                          <input type="hidden" name="appointmentId" value={appt.id} />
                          <Label htmlFor={`notes-${appt.id}`}>Visit notes</Label>
                          <Textarea id={`notes-${appt.id}`} name="notes" required placeholder="What happened during the visit" />
                          <Label htmlFor={`diagnosis-${appt.id}`}>Diagnosis (optional)</Label>
                          <Input id={`diagnosis-${appt.id}`} name="diagnosis" />
                          <Label htmlFor={`treatmentPlan-${appt.id}`}>Treatment plan (optional)</Label>
                          <Textarea id={`treatmentPlan-${appt.id}`} name="treatmentPlan" placeholder="What the patient should do going forward" />
                          <label className="flex items-center gap-2 pt-1 text-sm font-normal">
                            <input type="checkbox" name="followUpNeeded" value="true" className="size-4" />
                            Schedule a follow-up call
                          </label>
                          <div className="flex flex-col gap-1">
                            <Label htmlFor={`followUpDueDate-${appt.id}`}>Follow-up due date</Label>
                            <Input id={`followUpDueDate-${appt.id}`} name="followUpDueDate" type="date" className="w-44" />
                          </div>
                          <Label htmlFor={`followUpInstructions-${appt.id}`}>What should the nurse check?</Label>
                          <Textarea
                            id={`followUpInstructions-${appt.id}`}
                            name="followUpInstructions"
                            placeholder="e.g. Ask if the fever has subsided and whether they've had any rash since starting the antibiotic"
                          />
                          <Button type="submit" size="sm" className="mt-1 self-start">
                            Complete visit
                          </Button>
                        </form>
                      </details>
                      <div className="flex gap-2">
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
                    </div>
                  )}
                  {labTests.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-primary">Order lab tests</summary>
                      <form action={orderLabTests} className="mt-2 flex flex-col gap-2 rounded-md border p-2">
                        <input type="hidden" name="appointmentId" value={appt.id} />
                        <input type="hidden" name="patientId" value={appt.patientId} />
                        <div className="flex flex-col gap-1">
                          {labTests.map((t) => (
                            <label key={t.id} className="flex items-center gap-2 text-sm">
                              <input type="checkbox" name="testIds" value={t.id} />
                              {t.name}
                            </label>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 text-sm font-normal">
                          <input type="checkbox" name="patientConsented" value="true" required className="size-4" />
                          Patient has consented to this test
                        </label>
                        <Button type="submit" size="sm" variant="outline" className="self-start">
                          Order selected tests
                        </Button>
                      </form>
                    </details>
                  )}
                  {medicines.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-primary">Prescribe medicines</summary>
                      <form action={prescribeMedicines} className="mt-2 flex flex-col gap-3 rounded-md border p-2">
                        <input type="hidden" name="appointmentId" value={appt.id} />
                        <input type="hidden" name="patientId" value={appt.patientId} />
                        {Array.from({ length: PRESCRIPTION_ROW_COUNT }).map((_, i) => (
                          <div key={i} className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Medicine</span>
                              <NativeSelect name={`medicineId_${i}`} defaultValue="" className="w-48">
                                <option value="">— none —</option>
                                {medicines.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </NativeSelect>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Quantity</span>
                              <Input name={`quantity_${i}`} type="number" min={1} className="w-20" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Dose times</span>
                              <div className="flex gap-2">
                                {DOSE_TIMES.map((dt) => (
                                  <label key={dt.value} className="flex items-center gap-1 text-xs">
                                    <input type="checkbox" name={`doseTimes_${i}`} value={dt.value} />
                                    {dt.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Duration</span>
                              <div className="flex gap-1">
                                <Input name={`durationValue_${i}`} type="number" min={1} className="w-16" />
                                <NativeSelect name={`durationUnit_${i}`} defaultValue="" className="w-28">
                                  <option value="">—</option>
                                  <option value="DAYS">Days</option>
                                  <option value="WEEKS">Weeks</option>
                                  <option value="MONTHS">Months</option>
                                </NativeSelect>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">Note (optional)</span>
                              <Input name={`dosageInstructions_${i}`} className="w-36" placeholder="e.g. after food" />
                            </div>
                          </div>
                        ))}
                        <Button type="submit" size="sm" variant="outline" className="self-start">
                          Send prescription
                        </Button>
                      </form>
                    </details>
                  )}
                </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
