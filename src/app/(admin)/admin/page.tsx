import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listAppointmentsForTenant, listDoctorsForTenant } from "@/lib/appointments";
import {
  getOpdToday,
  getOpdPipeline,
  getDoctorPerformance,
  getPharmacyStats,
  getDashboardSummary,
  listUpcomingAppointments,
} from "@/lib/dashboardStats";
import { bookWalkIn, addDoctor, sendInvoiceWhatsApp, searchPatientsAction } from "./actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";

export const metadata = {
  title: "Admin Dashboard",
};

function formatINR(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export default async function AdminHome() {
  const tenantId = await requireTenantId();
  const [
    appointments,
    doctors,
    opdToday,
    opdPipeline,
    doctorPerformance,
    pharmacyStats,
    summary,
    { upcoming, totalUpcoming },
  ] = await Promise.all([
    listAppointmentsForTenant(tenantId),
    listDoctorsForTenant(tenantId),
    getOpdToday(tenantId),
    getOpdPipeline(tenantId),
    getDoctorPerformance(tenantId),
    getPharmacyStats(tenantId),
    getDashboardSummary(tenantId),
    listUpcomingAppointments(tenantId, 5),
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Admin / Reception Console</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Patients</p>
          <p className="mt-1 text-2xl font-semibold">{summary.totalPatients.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Appointments today</p>
          <p className="mt-1 text-2xl font-semibold">
            {summary.appointmentsToday.completed}/{summary.appointmentsToday.total}
          </p>
          <p className="text-xs text-muted-foreground">{summary.appointmentsToday.confirmed} confirmed</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue this month</p>
          <p className="mt-1 text-2xl font-semibold">{formatINR(summary.revenueThisMonth)}</p>
          <p className="text-xs text-muted-foreground">{formatINR(summary.pendingThisMonth)} pending</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Consultations this month</p>
          <p className="mt-1 text-2xl font-semibold">{summary.consultationsThisMonth}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/admin/schedule/appointments?date=today" className="rounded-lg border p-3 text-sm font-medium hover:bg-muted">
            Today&apos;s appointments
          </Link>
          <Link href="/admin/patients" className="rounded-lg border p-3 text-sm font-medium hover:bg-muted">
            Show patients
          </Link>
          <Link href={`/admin/reports?from=${todayStr}&to=${todayStr}`} className="rounded-lg border p-3 text-sm font-medium hover:bg-muted">
            Today&apos;s revenue
          </Link>
          <Link href="/admin/billing/invoices?filter=UNPAID" className="rounded-lg border p-3 text-sm font-medium hover:bg-muted">
            Pending payments
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Upcoming appointments</CardTitle>
            <CardDescription>Next {upcoming.length} of {totalUpcoming} upcoming</CardDescription>
          </div>
          <Link href="/admin/schedule/appointments" className="text-sm font-medium text-primary hover:underline">
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border">
              {upcoming.map((appt) => (
                <li key={appt.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div>
                    <span className="font-medium">{appt.patient.user.name}</span>
                    <span className="text-muted-foreground"> — Dr. {appt.doctor.user.name}</span>
                  </div>
                  <span className="text-muted-foreground">{new Date(appt.datetime).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>OPD Today</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Awaiting</p>
              <p className="mt-1 text-3xl font-semibold">{opdToday.awaiting}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
              <p className="mt-1 text-3xl font-semibold">{opdToday.completed}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OPD Pipeline</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {opdPipeline.map((row) => (
              <div key={row.label} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 text-muted-foreground">{row.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${row.pct}%` }} />
                </div>
                <span className="w-12 shrink-0 text-right font-medium">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Doctor Performance</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {doctorPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No doctors yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Appointments</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Cancelled</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Avg Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctorPerformance.map((d) => (
                  <TableRow key={d.doctorId}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground">{d.specialty}</TableCell>
                    <TableCell>{d.total}</TableCell>
                    <TableCell className="text-emerald-600">{d.completed}</TableCell>
                    <TableCell className="text-red-600">{d.cancelled}</TableCell>
                    <TableCell>{formatINR(d.revenue)}</TableCell>
                    <TableCell>{formatINR(d.avgFee)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pharmacy</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </div>
          <Link href="/admin/pharmacy" className="text-sm font-medium text-primary hover:underline">
            Open pharmacy →
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue (30d)</p>
              <p className="mt-1 text-xl font-semibold">{formatINR(pharmacyStats.revenue)}</p>
              <p className="text-xs text-muted-foreground">{pharmacyStats.billsCount} bills</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventory at cost</p>
              <p className="mt-1 text-xl font-semibold">{formatINR(pharmacyStats.inventoryAtCost)}</p>
              <p className="text-xs text-muted-foreground">MRP {formatINR(pharmacyStats.inventoryAtMrp)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Dead stock</p>
              <p className="mt-1 text-xl font-semibold text-amber-600">{formatINR(pharmacyStats.deadStockAtCost)}</p>
              <p className="text-xs text-muted-foreground">{pharmacyStats.skuCount} SKUs · no sale 90d</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Expiring within 30 days (at cost)</p>
              <p className="mt-1 text-xl font-semibold text-amber-600">{formatINR(pharmacyStats.expiringSoonValueAtCost)}</p>
              <p className="text-xs text-muted-foreground">
                {pharmacyStats.expiringSoonCount} units · MRP {formatINR(pharmacyStats.expiringSoonValueAtMrp)}
              </p>
            </div>
          </div>

          {pharmacyStats.unpricedCount > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
              <span className="font-medium text-amber-800 dark:text-amber-300">
                {pharmacyStats.unpricedCount} medicine{pharmacyStats.unpricedCount === 1 ? "" : "s"} have no price set
              </span>{" "}
              <span className="text-amber-700 dark:text-amber-400">
                — dispensing these will bill patients ₹0, and their stock is excluded from the cost/dead-stock figures above.
              </span>{" "}
              <Link href="/admin/pharmacy/medicines?unpriced=true" className="font-medium text-primary hover:underline">
                Set prices →
              </Link>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Top moving medicines (30d)</p>
            {pharmacyStats.topMoving.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dispensing activity in this period.</p>
            ) : (
              <ul className="flex flex-col divide-y rounded-lg border">
                {pharmacyStats.topMoving.map((m) => (
                  <li key={m.name} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground">
                      {formatINR(m.revenue)} · {m.qty} units
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

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
              <Label htmlFor="patientId">Patient</Label>
              <SearchableSelect
                id="patientId"
                name="patientId"
                required
                placeholder="Search patients by name, phone, or email…"
                search={searchPatientsAction}
              />
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
