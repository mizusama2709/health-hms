import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { requireTenantId } from "@/lib/tenant";
import {
  listAppointmentsForTenantDetailed,
  getTenantAppointmentStats,
  listDoctorsForTenant,
  type AppointmentDateFilter,
  type AppointmentPaymentFilter,
} from "@/lib/appointments";
import { cancelAppointmentActionResult, sendReceiptAction } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm } from "@/components/action-form";
import { StatTile } from "@/components/stat-tile";
import { cn } from "@/lib/utils";
import { CalendarDays, Clock, CheckCircle2, CalendarCheck2, IndianRupee, CalendarX2 } from "lucide-react";

export const metadata = {
  title: "Appointments",
};

const DATE_FILTERS: { value: AppointmentDateFilter | ""; label: string }[] = [
  { value: "", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "This week" },
  { value: "nextWeek", label: "Next week" },
];

const PAYMENT_FILTERS: { value: AppointmentPaymentFilter | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "PENDING_PAYMENT", label: "Pending payment" },
  { value: "PARTIAL", label: "Partial" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatINR(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function filterChipUrl(params: URLSearchParams, key: string, value: string) {
  const q = new URLSearchParams(params);
  if (value) q.set(key, value);
  else q.delete(key);
  return `/admin/schedule/appointments?${q.toString()}`;
}

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; date?: string; payment?: string; doctorId?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;

  const date = (params.date || undefined) as AppointmentDateFilter | undefined;
  const payment = (params.payment || undefined) as AppointmentPaymentFilter | undefined;

  const [appointments, stats, doctors] = await Promise.all([
    listAppointmentsForTenantDetailed(tenantId, { search: params.search, date, payment, doctorId: params.doctorId }),
    getTenantAppointmentStats(tenantId, params.doctorId),
    listDoctorsForTenant(tenantId),
  ]);

  const currentQuery = new URLSearchParams();
  if (params.search) currentQuery.set("search", params.search);
  if (params.date) currentQuery.set("date", params.date);
  if (params.payment) currentQuery.set("payment", params.payment);
  if (params.doctorId) currentQuery.set("doctorId", params.doctorId);
  const currentUrl = `/admin/schedule/appointments${currentQuery.toString() ? `?${currentQuery.toString()}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Appointments</h1>
          <p className="text-sm text-muted-foreground">Manage appointments and payment tracking across all doctors</p>
        </div>
        <a href={currentUrl} className="h-9 rounded-lg border px-4 text-sm font-medium leading-9 hover:bg-muted">
          Refresh
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Total" value={stats.total} icon={CalendarDays} iconColor="blue" />
        <StatTile label="Pending payment" value={stats.pendingPayment} valueClassName="text-amber-500" icon={Clock} iconColor="amber" />
        <StatTile label="Confirmed" value={stats.confirmed} valueClassName="text-emerald-500" icon={CheckCircle2} iconColor="emerald" />
        <StatTile label="Completed" value={stats.completed} icon={CalendarCheck2} iconColor="violet" />
        <StatTile label="Revenue" value={formatINR(stats.revenue)} icon={IndianRupee} iconColor="emerald" />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Search</span>
              <Input name="search" placeholder="Patient name or phone..." defaultValue={params.search ?? ""} className="w-64" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Doctor</span>
              <NativeSelect name="doctorId" defaultValue={params.doctorId ?? ""} className="w-56">
                <option value="">All doctors</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user.name} — {d.specialty}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <button type="submit" className="h-9 rounded-lg border px-4 text-sm font-medium hover:bg-muted">
              Apply
            </button>
          </form>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Date</span>
            <div className="flex flex-wrap gap-2">
              {DATE_FILTERS.map((f) => (
                <Link
                  key={f.label}
                  href={filterChipUrl(currentQuery, "date", f.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    (date ?? "") === f.value ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_FILTERS.map((f) => (
                <Link
                  key={f.label}
                  href={filterChipUrl(currentQuery, "payment", f.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    (payment ?? "") === f.value ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </div>

          {appointments.length === 0 ? (
            <EmptyState icon={CalendarX2} message={<>No appointments match these filters.</>} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Date &amp; time</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        <div>{a.patient.user.name}</div>
                        {a.patient.user.phone && <div className="text-xs text-muted-foreground">{a.patient.user.phone}</div>}
                      </TableCell>
                      <TableCell>
                        {a.serviceType} — {a.type}
                      </TableCell>
                      <TableCell>Dr. {a.doctor.user.name}</TableCell>
                      <TableCell>
                        {new Date(a.datetime).toLocaleDateString()}
                        <div className="text-xs text-muted-foreground">
                          {new Date(a.datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </TableCell>
                      <TableCell>{a.feeAmount ? formatINR(Number(a.feeAmount)) : "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} type="appointment" />
                        {a.status === "CANCELLED" && a.cancelledBy && (
                          <div className="mt-0.5 text-xs text-muted-foreground">by {titleCase(a.cancelledBy)}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {a.invoice ? (
                          <div>
                            <StatusBadge status={a.invoice.status} type="invoice" />
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {formatINR(Number(a.invoice.amountPaid))} paid
                              {a.invoice.payments[0] && ` (${titleCase(a.invoice.payments[0].mode)})`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No invoice</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Link href={`/admin/schedule/appointments/${a.id}/edit`} className="font-medium text-primary hover:underline">
                            Edit
                          </Link>
                          {a.status !== "CANCELLED" && (
                            <ActionForm
                              action={cancelAppointmentActionResult}
                              confirmMessage={`Cancel ${a.patient.user.name}'s appointment? This cannot be undone.`}
                            >
                              <input type="hidden" name="appointmentId" value={a.id} />
                              <button type="submit" className="font-medium text-destructive hover:underline">
                                Cancel
                              </button>
                            </ActionForm>
                          )}
                          <Link href={`/admin/schedule/appointments/${a.id}/receipt`} className="font-medium text-primary hover:underline">
                            Receipt
                          </Link>
                          {a.patient.user.phone && (
                            <form action={sendReceiptAction.bind(null, a.id)}>
                              <button type="submit" className="font-medium text-primary hover:underline">
                                Send
                              </button>
                            </form>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
