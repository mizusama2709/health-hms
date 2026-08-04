import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listAppointmentsForDoctor } from "@/lib/appointments";
import { listLabTests, listLatestCompletedLabOrdersForPatients, listAppointmentIdsWithUnlinkedLabOrders } from "@/lib/lab";
import { countMedicines } from "@/lib/pharmacy";
import {
  setAppointmentStatusActionResult,
  completeVisitActionResult,
  orderLabTestsActionResult,
  orderImagingStudyActionResult,
  prescribeMedicinesActionResult,
  searchMedicinesAction,
} from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm } from "@/components/action-form";
import { PrescriptionRows } from "@/components/prescription-rows";
import { Badge } from "@/components/ui/badge";
import { FLAG_BADGE_CLASS } from "@/components/lab-result-gauge";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Doctor Dashboard",
};

const SCOPE_FILTERS: { value: "today" | "upcoming" | "all"; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "all", label: "All" },
];

export default async function DoctorHome({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const tenantId = session!.user.tenantId!;
  const params = await searchParams;
  const scope = params.scope === "upcoming" || params.scope === "all" ? params.scope : "today";

  const doctor = await db.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Doctor dashboard</h1>
        <p className="text-sm text-muted-foreground">No doctor profile linked to this account.</p>
      </div>
    );
  }

  const [appointments, labTests, medicineCount] = await Promise.all([
    listAppointmentsForDoctor(doctor.id, tenantId, { scope }),
    listLabTests(tenantId, { isActive: true }),
    countMedicines(tenantId, { isActive: true }),
  ]);

  const [recentLabsByPatient, appointmentIdsWithPendingLabOrders] = await Promise.all([
    listLatestCompletedLabOrdersForPatients(tenantId, [...new Set(appointments.map((a) => a.patientId))]),
    listAppointmentIdsWithUnlinkedLabOrders(tenantId, appointments.map((a) => a.id)),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your schedule</h1>
        <Link href="/doctor/schedule/calendar" className="text-sm font-medium text-primary hover:underline">
          Calendar view
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {SCOPE_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/doctor?scope=${f.value}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              scope === f.value ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </Link>
        ))}
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
                const testsOrderedThisVisit = appointmentIdsWithPendingLabOrders.has(appt.id);
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
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-md bg-muted p-2 text-sm">
                      <span className="font-medium">Recent labs</span>
                      <span className="text-xs text-muted-foreground">
                        ({new Date(recentLabs.orderedAt).toLocaleDateString()})
                      </span>
                      {recentLabs.items.map((i) => (
                        <Badge
                          key={i.id}
                          variant="outline"
                          className={cn("border-transparent font-normal", i.flag && FLAG_BADGE_CLASS[i.flag])}
                        >
                          {i.labTest.name}: {i.resultValue ?? "—"} {i.resultUnit ?? ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {appt.status === "BOOKED" && (
                    <div className="mt-2 flex flex-col gap-2">
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-primary">Complete visit</summary>
                        <ActionForm action={completeVisitActionResult} className="mt-2 flex flex-col gap-2 rounded-md border p-2">
                          <input type="hidden" name="appointmentId" value={appt.id} />
                          <Label htmlFor={`notes-${appt.id}`}>Visit notes</Label>
                          <Textarea id={`notes-${appt.id}`} name="notes" required placeholder="What happened during the visit" />
                          <Label htmlFor={`diagnosis-${appt.id}`}>Diagnosis (optional)</Label>
                          <Input id={`diagnosis-${appt.id}`} name="diagnosis" />
                          <Label htmlFor={`treatmentPlan-${appt.id}`}>Treatment plan (optional)</Label>
                          <Textarea id={`treatmentPlan-${appt.id}`} name="treatmentPlan" placeholder="What the patient should do going forward" />
                          <label className="flex items-center gap-2 pt-1 text-sm font-normal">
                            <input
                              type="checkbox"
                              name="followUpNeeded"
                              value="true"
                              defaultChecked={testsOrderedThisVisit}
                              className="size-4"
                            />
                            Schedule a follow-up call
                            {testsOrderedThisVisit && (
                              <span className="text-xs text-muted-foreground">
                                (pre-checked — tests were ordered for this visit)
                              </span>
                            )}
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
                        </ActionForm>
                      </details>
                      <div className="flex gap-2">
                        <ActionForm
                          action={setAppointmentStatusActionResult}
                          confirmMessage={`Mark ${appt.patient.user.name} as a no-show?`}
                        >
                          <input type="hidden" name="appointmentId" value={appt.id} />
                          <input type="hidden" name="status" value="NO_SHOW" />
                          <Button type="submit" size="sm" variant="outline">
                            Mark no-show
                          </Button>
                        </ActionForm>
                        <ActionForm
                          action={setAppointmentStatusActionResult}
                          confirmMessage={`Cancel ${appt.patient.user.name}'s appointment? This cannot be undone.`}
                        >
                          <input type="hidden" name="appointmentId" value={appt.id} />
                          <input type="hidden" name="status" value="CANCELLED" />
                          <Button type="submit" size="sm" variant="ghost">
                            Cancel
                          </Button>
                        </ActionForm>
                      </div>
                    </div>
                  )}
                  {labTests.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-primary">Order lab tests</summary>
                      <ActionForm action={orderLabTestsActionResult} className="mt-2 flex flex-col gap-2 rounded-md border p-2">
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
                      </ActionForm>
                    </details>
                  )}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium text-primary">Order imaging study</summary>
                    <ActionForm action={orderImagingStudyActionResult} className="mt-2 flex flex-col gap-2 rounded-md border p-2">
                      <input type="hidden" name="appointmentId" value={appt.id} />
                      <input type="hidden" name="patientId" value={appt.patientId} />
                      <Label htmlFor={`modality-${appt.id}`}>Modality</Label>
                      <NativeSelect id={`modality-${appt.id}`} name="modality" defaultValue="" required className="w-40">
                        <option value="" disabled>
                          — choose —
                        </option>
                        <option value="XRAY">X-Ray</option>
                        <option value="CT">CT</option>
                        <option value="MRI">MRI</option>
                        <option value="ULTRASOUND">Ultrasound</option>
                      </NativeSelect>
                      <Label htmlFor={`imaging-description-${appt.id}`}>Description (optional)</Label>
                      <Input id={`imaging-description-${appt.id}`} name="description" placeholder="e.g. Lumbar spine, r/o fracture" />
                      <label className="flex items-center gap-2 text-sm font-normal">
                        <input type="checkbox" name="patientConsented" value="true" required className="size-4" />
                        Patient has consented to this study
                      </label>
                      <Button type="submit" size="sm" variant="outline" className="self-start">
                        Order study
                      </Button>
                    </ActionForm>
                  </details>
                  {medicineCount > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-primary">Prescribe medicines</summary>
                      <ActionForm action={prescribeMedicinesActionResult} className="mt-2 flex flex-col gap-3 rounded-md border p-2">
                        <input type="hidden" name="appointmentId" value={appt.id} />
                        <input type="hidden" name="patientId" value={appt.patientId} />
                        <PrescriptionRows search={searchMedicinesAction} />
                        <Button type="submit" size="sm" variant="outline" className="self-start">
                          Send prescription
                        </Button>
                      </ActionForm>
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
