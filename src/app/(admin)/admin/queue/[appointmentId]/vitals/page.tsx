import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantId } from "@/lib/tenant";
import { db } from "@/lib/db";
import { listVitalsForPatient } from "@/lib/vitals";
import { recordVitalsAction } from "../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default async function RecordVitalsPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const tenantId = await requireTenantId();
  const { appointmentId } = await params;

  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: { patient: { include: { user: true } } },
  });

  if (!appointment) notFound();

  const previousVitals = await listVitalsForPatient(appointment.patientId, tenantId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/queue" className="text-sm font-medium text-primary hover:underline">
          ← Back to Queue
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Record vitals</h1>
        <p className="text-sm text-muted-foreground">
          {appointment.patient.user.name} — {new Date(appointment.datetime).toLocaleString()}
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Vitals</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={recordVitalsAction} className="flex flex-col gap-2">
            <input type="hidden" name="patientId" value={appointment.patientId} />
            <input type="hidden" name="appointmentId" value={appointment.id} />
            <Label htmlFor="bp">Blood pressure</Label>
            <Input id="bp" name="bp" placeholder="120/80" />
            <Label htmlFor="glucose">Glucose (mg/dL)</Label>
            <Input id="glucose" name="glucose" type="number" step="0.1" />
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input id="weight" name="weight" type="number" step="0.1" />
            <Label htmlFor="spo2">SpO₂ (%)</Label>
            <Input id="spo2" name="spo2" type="number" min={0} max={100} />
            <Button type="submit" className="mt-2 self-start">
              Save vitals
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previous vitals ({previousVitals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {previousVitals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No previous vitals recorded for this patient.</p>
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
                {previousVitals.map((v) => (
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
    </div>
  );
}
