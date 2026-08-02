import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listAppointmentsForDoctor } from "@/lib/appointments";
import { listLabTests, listLatestCompletedLabOrdersForPatients, listAppointmentIdsWithUnlinkedLabOrders } from "@/lib/lab";
import { countMedicines } from "@/lib/pharmacy";
import {
  setAppointmentStatus,
  completeVisitActionResult,
  orderLabTestsActionResult,
  prescribeMedicinesActionResult,
  searchMedicinesAction,
} from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm } from "@/components/action-form";
import { PrescriptionRows } from "@/components/prescription-rows";

export const metadata = {
  title: "Doctor Dashboard",
};

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

  const [appointments, labTests, medicineCount] = await Promise.all([
    listAppointmentsForDoctor(doctor.id, tenantId),
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
                    <div className="mt-2 rounded-md bg-muted p-2 text-sm">
                      <span className="font-medium">Recent labs</span> ({new Date(recentLabs.orderedAt).toLocaleDateString()}):{" "}
                      {recentLabs.items.map((i) => `${i.labTest.name}: ${i.resultValue ?? "—"} ${i.resultUnit ?? ""}`.trim()).join(", ")}
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
