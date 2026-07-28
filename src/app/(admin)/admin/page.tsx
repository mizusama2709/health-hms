import { requireTenantId } from "@/lib/tenant";
import { listAppointmentsForTenant, listDoctorsForTenant } from "@/lib/appointments";
import { bookWalkIn, addDoctor, sendInvoiceWhatsApp } from "./actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";

export default async function AdminHome() {
  const tenantId = await requireTenantId();
  const [appointments, doctors] = await Promise.all([
    listAppointmentsForTenant(tenantId),
    listDoctorsForTenant(tenantId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Admin / Reception Console</h1>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Doctors</CardTitle>
            <CardDescription>{doctors.length} on this tenant</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-1 text-sm">
              {doctors.map((d) => (
                <li key={d.id} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{d.user.name}</span> — {d.specialty} (
                  {d.user.email})
                </li>
              ))}
            </ul>
            <form action={addDoctor} className="flex flex-col gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" placeholder="Full name" required />
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="Email" required />
              <Label htmlFor="specialty">Specialty</Label>
              <Input id="specialty" name="specialty" placeholder="Specialty" required />
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" name="password" type="password" placeholder="Temporary password" required minLength={8} />
              <Button type="submit" className="mt-2">
                Add doctor
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Book a walk-in</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={bookWalkIn} className="flex flex-col gap-2">
              <Label htmlFor="doctorId">Doctor</Label>
              <NativeSelect id="doctorId" name="doctorId" required>
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user.name} — {d.specialty}
                  </option>
                ))}
              </NativeSelect>
              <Label htmlFor="patientEmail">Patient email</Label>
              <Input id="patientEmail" name="patientEmail" type="email" placeholder="Patient email" required />
              <Label htmlFor="datetime">Date &amp; time</Label>
              <Input id="datetime" name="datetime" type="datetime-local" required />
              <Button type="submit" className="mt-2">
                Book appointment
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send invoice via WhatsApp</CardTitle>
            <CardDescription>Mocked for now — no real WhatsApp credentials yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={sendInvoiceWhatsApp} className="flex flex-col gap-2">
              <Label htmlFor="invoiceId">Invoice ID</Label>
              <Input id="invoiceId" name="invoiceId" placeholder="Invoice ID" required />
              <Label htmlFor="toPhone">Patient phone</Label>
              <Input id="toPhone" name="toPhone" placeholder="e.g. +911234567890" required />
              <Button type="submit" className="mt-2">
                Send invoice
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date &amp; time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="font-medium">{appt.patient.user.name}</TableCell>
                    <TableCell>Dr. {appt.doctor.user.name}</TableCell>
                    <TableCell>{new Date(appt.datetime).toLocaleString()}</TableCell>
                    <TableCell>{appt.type}</TableCell>
                    <TableCell>
                      <StatusBadge status={appt.status} type="appointment" />
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
