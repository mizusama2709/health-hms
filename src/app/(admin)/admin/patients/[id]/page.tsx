import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantId } from "@/lib/tenant";
import { getPatientWithHistory, computeAge } from "@/lib/patients";
import { getPatientEfficacyReport } from "@/lib/reports";
import { listLabOrders } from "@/lib/lab";
import { listImagingOrders } from "@/lib/imaging";
import { updatePatientProfileAction } from "../actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { LabResultGauge } from "@/components/lab-result-gauge";
import { LabTrendChart, type LabTrendPoint } from "@/components/lab-trend-chart";

export const metadata = {
  title: "Patient Details",
};

function toDateInputValue(d: Date | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default async function PatientChartPage({ params }: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await params;
  const patient = await getPatientWithHistory(id, tenantId);

  if (!patient) notFound();

  const age = computeAge(patient.dateOfBirth);
  const efficacy = await getPatientEfficacyReport(tenantId, patient.id);
  const labOrders = await listLabOrders(tenantId, { patientId: patient.id });
  const imagingOrders = await listImagingOrders(tenantId, { patientId: patient.id });

  // Group results by test across all orders — any test with 2+ numeric
  // values across visits gets a trend chart below the per-order results.
  const byTest = new Map<string, { testName: string; unit: string | null; points: LabTrendPoint[] }>();
  for (const order of labOrders) {
    for (const item of order.items) {
      const value = item.resultValue !== null ? Number(item.resultValue) : NaN;
      if (!Number.isFinite(value)) continue;
      const entry = byTest.get(item.labTestId) ?? { testName: item.labTest.name, unit: item.resultUnit, points: [] };
      entry.points.push({ date: order.orderedAt, value, flag: item.flag });
      byTest.set(item.labTestId, entry);
    }
  }
  const trends = [...byTest.values()].filter((t) => t.points.length >= 2);

  const STEP_LABELS: Record<string, string> = {
    APPOINTMENT_BOOKED: "Booked",
    VITALS_TAKEN: "Vitals",
    OPD_STARTED: "OPD started",
    OPD_COMPLETED: "OPD completed",
    LAB_ORDERED: "Lab ordered",
    LAB_COMPLETED: "Lab completed",
    MEDICINES_PRESCRIBED: "Prescribed",
    MEDICINES_DISPENSED: "Dispensed",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/patients" className="text-sm font-medium text-primary hover:underline">
          ← Back to Patients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{patient.user.name}</h1>
        <p className="text-sm text-muted-foreground">
          {patient.user.email} {patient.user.phone && `· ${patient.user.phone}`}
          {age !== null && ` · ${age} yrs`}
          {patient.gender && ` · ${patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase()}`}
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePatientProfileAction} className="flex flex-col gap-2">
            <input type="hidden" name="patientId" value={patient.id} />
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" defaultValue={patient.user.name} required />
            <Label htmlFor="phone">Mobile number</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={patient.user.phone ?? ""} placeholder="+91…" />
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={toDateInputValue(patient.dateOfBirth)} />
            <Label htmlFor="gender">Gender</Label>
            <NativeSelect id="gender" name="gender" defaultValue={patient.gender ?? ""}>
              <option value="">— not specified —</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </NativeSelect>
            <Button type="submit" className="mt-2 self-start">
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appointment history ({patient.appointments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {patient.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {patient.appointments.map((appt) => (
                <li key={appt.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Dr. {appt.doctor.user.name}</span>
                      <span className="text-sm text-muted-foreground"> — {new Date(appt.datetime).toLocaleString()}</span>
                    </div>
                    <StatusBadge status={appt.status} type="appointment" />
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {appt.serviceType} · {appt.type}
                  </div>
                  {appt.visitRecord && (
                    <div className="mt-2 rounded-md bg-muted p-2 text-sm">
                      <div>
                        <span className="font-medium">Notes:</span> {appt.visitRecord.notes}
                      </div>
                      {appt.visitRecord.diagnosis && (
                        <div>
                          <span className="font-medium">Diagnosis:</span> {appt.visitRecord.diagnosis}
                        </div>
                      )}
                      {appt.visitRecord.prescription && (
                        <div>
                          <span className="font-medium">Prescription:</span> {appt.visitRecord.prescription}
                        </div>
                      )}
                    </div>
                  )}
                  {appt.invoices.length > 0 && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Invoices:</span>{" "}
                      {appt.invoices.map((inv) => `${inv.invoiceNumber} (${inv.status})`).join(", ")}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vitals history ({patient.vitals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {patient.vitals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vitals recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>BP</TableHead>
                  <TableHead>Glucose</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>SpO₂</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patient.vitals.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.recordedAt.toLocaleString()}</TableCell>
                    <TableCell>{v.bp ?? "—"}</TableCell>
                    <TableCell>{v.glucose ? Number(v.glucose).toFixed(1) : "—"}</TableCell>
                    <TableCell>{v.weight ? Number(v.weight).toFixed(1) : "—"}</TableCell>
                    <TableCell>{v.spo2 ?? "—"}</TableCell>
                    <TableCell>{v.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lab reports &amp; trends</CardTitle>
          <CardDescription>{labOrders.length} order(s) on file</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {labOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lab orders yet.</p>
          ) : (
            <>
              {trends.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {trends.map((t) => (
                    <div key={t.testName} className="rounded-lg border p-3">
                      <LabTrendChart testName={t.testName} unit={t.unit} points={t.points} />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {labOrders.map((order) => (
                  <div key={order.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{new Date(order.orderedAt).toLocaleString()}</span>
                      <Badge variant={order.status === "COMPLETED" ? "default" : "outline"}>{order.status}</Badge>
                    </div>
                    <div className="mt-2 flex flex-col gap-2">
                      {order.items.map((item) => (
                        <LabResultGauge
                          key={item.id}
                          testName={item.labTest.name}
                          resultValue={item.resultValue}
                          resultUnit={item.resultUnit}
                          referenceRange={item.referenceRange}
                          flag={item.flag}
                        />
                      ))}
                    </div>
                    {order.reports.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-sm">
                        {order.reports.map((r) => (
                          <a
                            key={r.id}
                            href={r.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            View report ({new Date(r.uploadedAt).toLocaleDateString()})
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imaging studies</CardTitle>
          <CardDescription>{imagingOrders.length} order(s) on file</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {imagingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imaging orders yet.</p>
          ) : (
            imagingOrders.map((order) => (
              <div key={order.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {order.modality}
                    {order.description ? ` — ${order.description}` : ""}
                  </span>
                  <Badge variant={order.status === "COMPLETED" ? "default" : "outline"}>{order.status}</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{new Date(order.orderedAt).toLocaleString()}</div>
                {order.studies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {order.studies.map((s) => (
                      <Link key={s.id} href={`/admin/patients/${patient.id}/imaging/${s.id}`} className="font-medium text-primary hover:underline">
                        View study ({s.series.reduce((sum, se) => sum + se.instances.length, 0)} images)
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Efficacy drilldown</CardTitle>
          <CardDescription>
            {efficacy.appointmentsConsidered} appointment(s) — patient journey step timing for this patient only
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {efficacy.appointmentsConsidered === 0 ? (
            <p className="text-sm text-muted-foreground">No journey data recorded yet.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transition</TableHead>
                    <TableHead>Avg minutes</TableHead>
                    <TableHead>Sample size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {efficacy.transitionAverages.map((t) => (
                    <TableRow key={`${t.from}-${t.to}`}>
                      <TableCell>
                        {STEP_LABELS[t.from] ?? t.from} → {STEP_LABELS[t.to] ?? t.to}
                      </TableCell>
                      <TableCell>{t.avgMinutes !== null ? t.avgMinutes.toFixed(1) : "—"}</TableCell>
                      <TableCell>{t.sampleSize}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-muted-foreground">Per-appointment timeline</p>
                {efficacy.perAppointment.map((appt) => (
                  <div key={appt.appointmentId} className="rounded-lg border p-3 text-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium">{new Date(appt.datetime).toLocaleString()}</span>
                      <StatusBadge status={appt.status} type="appointment" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {appt.stepTimes.map(({ step, occurredAt }) => (
                        <span
                          key={step}
                          className={
                            occurredAt
                              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                          }
                        >
                          {STEP_LABELS[step] ?? step}
                          {occurredAt ? ` · ${occurredAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
