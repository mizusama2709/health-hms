import { requireTenantId } from "@/lib/tenant";
import {
  getAppointmentForCalendarTenant,
  getAppointmentsForRangeTenant,
  getTenantScheduleStats,
  listDoctorsForTenant,
} from "@/lib/appointments";
import { NativeSelect } from "@/components/ui/native-select";
import { CalendarView, toDateParam, startOfWeek, buildMonthGrid, type View } from "@/components/calendar-view";

export const metadata = {
  title: "Calendar",
};

function buildUrl(view: View, date: Date, doctorId?: string, appt?: string) {
  const q = new URLSearchParams({ view, date: toDateParam(date) });
  if (doctorId) q.set("doctorId", doctorId);
  if (appt) q.set("appt", appt);
  return `/admin/schedule/calendar?${q.toString()}`;
}

export default async function AdminScheduleCalendar({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; appt?: string; view?: string; doctorId?: string }>;
}) {
  const { date, appt, view: viewParam, doctorId } = await searchParams;
  const tenantId = await requireTenantId();

  const doctors = await listDoctorsForTenant(tenantId);

  const view: View = viewParam === "week" || viewParam === "month" ? viewParam : "day";
  const today = new Date();
  const day = date ? new Date(date) : today;

  const weekStart = startOfWeek(day);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const monthWeeks = buildMonthGrid(day);
  const monthStart = monthWeeks[0][0].date;
  const monthEnd = new Date(monthWeeks[5][6].date);
  monthEnd.setHours(23, 59, 59, 999);

  const [stats, dayAppointments, weekAppointments, monthAppointments] = await Promise.all([
    getTenantScheduleStats(tenantId, doctorId),
    view === "day" ? getAppointmentForCalendarTenant(tenantId, day, doctorId) : Promise.resolve([]),
    view === "week" ? getAppointmentsForRangeTenant(tenantId, weekStart, weekEnd, doctorId) : Promise.resolve([]),
    view === "month" ? getAppointmentsForRangeTenant(tenantId, monthStart, monthEnd, doctorId) : Promise.resolve([]),
  ]);

  return (
    <CalendarView
      view={view}
      day={day}
      today={today}
      weekStart={weekStart}
      weekEnd={weekEnd}
      weekDays={weekDays}
      monthWeeks={monthWeeks}
      dayAppointments={dayAppointments}
      weekAppointments={weekAppointments}
      monthAppointments={monthAppointments}
      selectedAppointmentId={view === "day" ? appt : undefined}
      stats={stats}
      buildUrl={(v, d, a) => buildUrl(v, d, doctorId, a)}
      title="Calendar"
      subtitle="All doctors' schedule"
      secondaryLabel={(a) => `Dr. ${a.doctor.user.name}`}
      selectedExtra={(a) => (
        <>
          <p className="text-sm text-muted-foreground">Doctor: Dr. {a.doctor.user.name}</p>
          <p className="text-sm text-muted-foreground">Type: {a.type}</p>
        </>
      )}
      filterBar={
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="date" value={toDateParam(day)} />
          <NativeSelect name="doctorId" defaultValue={doctorId ?? ""} className="w-56">
            <option value="">All doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.user.name} — {d.specialty}
              </option>
            ))}
          </NativeSelect>
          <button type="submit" className="h-9 rounded-lg border px-4 text-sm font-medium hover:bg-muted">
            Apply
          </button>
        </form>
      }
    />
  );
}
