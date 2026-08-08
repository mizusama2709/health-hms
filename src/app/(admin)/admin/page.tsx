import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { AlertTriangle, Users, CalendarCheck, IndianRupee, Stethoscope, CalendarX2, Inbox, Package, Archive, Clock3 } from "lucide-react";
import { requireTenantId } from "@/lib/tenant";
import { listDoctorsForTenant } from "@/lib/appointments";
import {
  getOpdToday,
  getOpdPipeline,
  getDoctorPerformance,
  getPharmacyStats,
  getDashboardSummary,
  listUpcomingAppointments,
} from "@/lib/dashboardStats";
import { getRevenueTrend } from "@/lib/reports";
import { listFollowUpsDueToday } from "@/lib/followUps";
import { getOrganizationProfile } from "@/lib/organization";
import { listServices } from "@/lib/services";
import { listStaff } from "@/lib/staff";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { bookWalkInActionResult, addDoctorActionResult, sendInvoiceWhatsAppActionResult, searchPatientsAction } from "./actions";
import { ActionForm } from "@/components/action-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatTile } from "@/components/stat-tile";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Admin Dashboard",
};

function formatINR(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

// Fixed categorical order/hues — never reassigned by rank, so "New
// Patients" is always the same color regardless of which rows are present.
const PIPELINE_COLOR: Record<string, string> = {
  "New Patients": "bg-blue-500",
  "Appointment Booked": "bg-violet-500",
  "Payment Pending": "bg-amber-500",
  Enquiry: "bg-cyan-500",
  "Payment Collected": "bg-emerald-500",
  "Follow Up": "bg-fuchsia-500",
};

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ bookPatientId?: string; bookPatientName?: string }>;
}) {
  const tenantId = await requireTenantId();
  const { bookPatientId, bookPatientName } = await searchParams;
  const [
    doctors,
    opdToday,
    opdPipeline,
    doctorPerformance,
    pharmacyStats,
    summary,
    revenueTrend,
    { upcoming, totalUpcoming },
    { dueToday, totalDueToday },
    orgProfile,
    services,
    staff,
  ] = await Promise.all([
    listDoctorsForTenant(tenantId),
    getOpdToday(tenantId),
    getOpdPipeline(tenantId),
    getDoctorPerformance(tenantId),
    getPharmacyStats(tenantId),
    getDashboardSummary(tenantId),
    getRevenueTrend(tenantId, {}),
    listUpcomingAppointments(tenantId, 5),
    listFollowUpsDueToday(tenantId, 5),
    getOrganizationProfile(tenantId),
    listServices(tenantId),
    listStaff(tenantId),
  ]);

  const onboardingItems = [
    { label: "Set up your organization profile", done: Boolean(orgProfile?.legalName), href: "/admin/organization" },
    { label: "Add a doctor", done: doctors.length > 0, href: "/admin#add-doctor" },
    { label: "Add a billable service", done: services.length > 0, href: "/admin/services" },
    { label: "Invite the rest of your staff", done: staff.length > 1, href: "/admin/staff" },
  ];

  const todayStr = new Date().toISOString().slice(0, 10);

  const overdueFollowUps = dueToday.filter((f) => f.isOverdue).length;
  // Consolidates signals that would otherwise only surface by scrolling all
  // the way to the Follow-ups card or the Pharmacy card further down —
  // everything here is already fetched above, just re-surfaced up top.
  const attentionItems = [
    overdueFollowUps > 0 && {
      key: "followups",
      label: `${overdueFollowUps} overdue follow-up call${overdueFollowUps === 1 ? "" : "s"}`,
      href: "/admin/schedule/reminders",
    },
    pharmacyStats.unpricedCount > 0 && {
      key: "unpriced",
      label: `${pharmacyStats.unpricedCount} medicine${pharmacyStats.unpricedCount === 1 ? "" : "s"} with no price set`,
      href: "/admin/pharmacy/medicines?unpriced=true",
    },
    pharmacyStats.expiringSoonCount > 0 && {
      key: "expiring",
      label: `${pharmacyStats.expiringSoonCount} unit(s) of stock expiring within 30 days`,
      href: "/admin/pharmacy/medicines/batches",
    },
    pharmacyStats.skuCount > 0 && {
      key: "deadstock",
      label: `${pharmacyStats.skuCount} SKU(s) of dead stock (no sale in 90 days)`,
      href: "/admin/pharmacy",
    },
  ].filter((item): item is { key: string; label: string; href: string } => Boolean(item));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Admin / Reception Console</h1>

      <OnboardingChecklist items={onboardingItems} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Patients"
          value={summary.totalPatients.toLocaleString("en-IN")}
          icon={Users}
          iconColor="blue"
        />
        <StatTile
          label="Appointments today"
          value={`${summary.appointmentsToday.completed}/${summary.appointmentsToday.total}`}
          sub={`${summary.appointmentsToday.confirmed} confirmed`}
          icon={CalendarCheck}
          iconColor="violet"
        />
        <StatTile
          label="Revenue this month"
          value={formatINR(summary.revenueThisMonth)}
          sub={
            <>
              {formatINR(summary.pendingThisMonth)} pending
              {summary.revenueDeltaPercent !== null && (
                <span className={summary.revenueDeltaPercent >= 0 ? "text-emerald-500" : "text-destructive"}>
                  {" "}
                  · {summary.revenueDeltaPercent >= 0 ? "▲" : "▼"} {Math.abs(summary.revenueDeltaPercent).toFixed(0)}% vs last month
                </span>
              )}
            </>
          }
          icon={IndianRupee}
          iconColor="emerald"
          sparkline={revenueTrend.map((p) => p.revenue)}
        />
        <StatTile
          label="Consultations this month"
          value={summary.consultationsThisMonth}
          sub="Completed"
          icon={Stethoscope}
          iconColor="amber"
        />
      </div>

      {attentionItems.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="size-4" />
              Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y rounded-lg border border-amber-300 dark:border-amber-900">
              {attentionItems.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-4 py-2 text-sm text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
            <EmptyState icon={CalendarX2} message={<>No upcoming appointments.</>} />
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border">
              {upcoming.map((appt) => (
                <li key={appt.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar name={appt.patient.user.name} size="sm" />
                    <div>
                      <span className="font-medium">{appt.patient.user.name}</span>
                      <span className="text-muted-foreground"> — Dr. {appt.doctor.user.name}</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground">{new Date(appt.datetime).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Follow-up calls due today</CardTitle>
            <CardDescription>
              {totalDueToday === 0 ? "Nothing due" : `${dueToday.length} of ${totalDueToday} due or overdue`}
            </CardDescription>
          </div>
          <Link href="/admin/schedule/reminders" className="text-sm font-medium text-primary hover:underline">
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {dueToday.length === 0 ? (
            <EmptyState icon={Inbox} message={<>No follow-up calls due today.</>} />
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border">
              {dueToday.map((f) => (
                <li key={f.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="font-medium">{f.appointment.patient.user.name}</span>
                  <span className={f.isOverdue ? "font-medium text-destructive" : "text-muted-foreground"}>
                    {f.isOverdue ? "Overdue — " : "Due "}
                    {f.dueDate.toLocaleDateString()}
                  </span>
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
            <StatTile label="Awaiting" value={opdToday.awaiting} className="bg-muted/40 shadow-none ring-0" />
            <StatTile
              label="Completed"
              value={opdToday.completed}
              className="bg-muted/40 shadow-none ring-0"
              valueClassName="text-emerald-400"
            />
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
                  <div
                    className={cn("h-full min-w-1 rounded-full", PIPELINE_COLOR[row.label] ?? "bg-primary")}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-medium tabular-nums">{row.value}</span>
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
            <EmptyState icon={Stethoscope} message={<>No doctors yet.</>} />
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
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar name={d.name} size="sm" />
                        {d.name}
                      </div>
                    </TableCell>
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
            <StatTile
              label="Revenue (30d)"
              value={formatINR(pharmacyStats.revenue)}
              sub={`${pharmacyStats.billsCount} bills`}
              icon={IndianRupee}
              iconColor="emerald"
            />
            <StatTile
              label="Inventory at cost"
              value={formatINR(pharmacyStats.inventoryAtCost)}
              sub={`MRP ${formatINR(pharmacyStats.inventoryAtMrp)}`}
              icon={Archive}
              iconColor="violet"
            />
            <StatTile
              label="Dead stock"
              value={formatINR(pharmacyStats.deadStockAtCost)}
              valueClassName="text-amber-500"
              sub={`${pharmacyStats.skuCount} SKUs · no sale 90d`}
              icon={Package}
              iconColor="amber"
            />
            <StatTile
              label="Expiring within 30 days (at cost)"
              value={formatINR(pharmacyStats.expiringSoonValueAtCost)}
              valueClassName="text-amber-500"
              sub={`${pharmacyStats.expiringSoonCount} units · MRP ${formatINR(pharmacyStats.expiringSoonValueAtMrp)}`}
              icon={Clock3}
              iconColor="amber"
            />
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
              <EmptyState icon={Package} message={<>No dispensing activity in this period.</>} />
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
        <Card id="add-doctor">
          <CardHeader>
            <CardTitle>Doctors</CardTitle>
            <CardDescription>{doctors.length} on this tenant</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2 text-sm">
              {doctors.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-muted-foreground">
                  <Avatar name={d.user.name} size="sm" />
                  <span>
                    <span className="font-medium text-foreground">{d.user.name}</span> — {d.specialty} ({d.user.email})
                  </span>
                </li>
              ))}
            </ul>
            <ActionForm action={addDoctorActionResult} className="flex flex-col gap-2">
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
            </ActionForm>
          </CardContent>
        </Card>

        <Card id="book-walkin">
          <CardHeader>
            <CardTitle>Book a walk-in</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm
              action={bookWalkInActionResult}
              className="flex flex-col gap-2"
              nextStep={{ label: "Open queue", href: "/admin/queue" }}
            >
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
                defaultOption={bookPatientId && bookPatientName ? { value: bookPatientId, label: bookPatientName } : undefined}
              />
              <Label htmlFor="datetime">Date &amp; time</Label>
              <Input id="datetime" name="datetime" type="datetime-local" required />
              <Button type="submit" className="mt-2">
                Book appointment
              </Button>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send invoice via WhatsApp</CardTitle>
            <CardDescription>Mocked for now — no real WhatsApp credentials yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={sendInvoiceWhatsAppActionResult} className="flex flex-col gap-2">
              <Label htmlFor="invoiceId">Invoice ID</Label>
              <Input id="invoiceId" name="invoiceId" placeholder="Invoice ID" required />
              <Label htmlFor="toPhone">Patient phone</Label>
              <Input id="toPhone" name="toPhone" placeholder="e.g. +911234567890" required />
              <Button type="submit" className="mt-2">
                Send invoice
              </Button>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
