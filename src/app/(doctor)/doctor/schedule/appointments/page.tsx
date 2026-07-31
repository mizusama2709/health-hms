import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  listAppointmentsForDoctorDetailed,
  getDoctorAppointmentStats,
  type AppointmentDateFilter,
  type AppointmentPaymentFilter,
} from "@/lib/appointments";
import { cancelAppointmentAction, sendReceiptAction } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

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
  return `/doctor/schedule/appointments?${q.toString()}`;
}

export default async function DoctorAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; date?: string; payment?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const tenantId = session!.user.tenantId!;
  const params = await searchParams;

  const doctor = await db.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Appointments</h1>
        <p className="text-sm text-muted-foreground">No doctor profile linked to this account.</p>
      </div>
    );
  }

  const date = (params.date || undefined) as AppointmentDateFilter | undefined;
  const payment = (params.payment || undefined) as AppointmentPaymentFilter | undefined;

  const [appointments, stats] = await Promise.all([
    listAppointmentsForDoctorDetailed(doctor.id, tenantId, { search: params.search, date, payment }),
    getDoctorAppointmentStats(doctor.id, tenantId),
  ]);

  const currentQuery = new URLSearchParams();
  if (params.search) currentQuery.set("search", params.search);
  if (params.date) currentQuery.set("date", params.date);
  if (params.payment) currentQuery.set("payment", params.payment);
  const currentUrl = `/doctor/schedule/appointments${currentQuery.toString() ? `?${currentQuery.toString()}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Appointments</h1>
          <p className="text-sm text-muted-foreground">Manage your appointments and payment tracking</p>
        </div>
        <a href={currentUrl} className="h-9 rounded-lg border px-4 text-sm font-medium leading-9 hover:bg-muted">
          Refresh
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending payment</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{stats.pendingPayment}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Confirmed</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{stats.confirmed}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-semibold">{stats.completed}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</p>
          <p className="mt-1 text-2xl font-semibold">{formatINR(stats.revenue)}</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <form method="get" className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Search</span>
            <Input name="search" placeholder="Patient name or phone..." defaultValue={params.search ?? ""} className="max-w-sm" />
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
            <p className="text-sm text-muted-foreground">No appointments match these filters.</p>
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
                          <Link href={`/doctor/schedule/appointments/${a.id}/edit`} className="font-medium text-primary hover:underline">
                            Edit
                          </Link>
                          {a.status !== "CANCELLED" && (
                            <form action={cancelAppointmentAction.bind(null, a.id)}>
                              <button type="submit" className="font-medium text-destructive hover:underline">
                                Cancel
                              </button>
                            </form>
                          )}
                          <Link href={`/doctor/schedule/appointments/${a.id}/receipt`} className="font-medium text-primary hover:underline">
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
