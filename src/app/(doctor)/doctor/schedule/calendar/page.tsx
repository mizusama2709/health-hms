import { auth } from "@/lib/auth";
import { UserX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { db } from "@/lib/db";
import { getAppointmentForCalendar, getAppointmentsForRange, getScheduleStats } from "@/lib/appointments";
import { CalendarView, toDateParam, startOfWeek, buildMonthGrid, type View } from "@/components/calendar-view";

export const metadata = {
  title: "Calendar",
};

function buildUrl(view: View, date: Date, appt?: string) {
  const q = new URLSearchParams({ view, date: toDateParam(date) });
  if (appt) q.set("appt", appt);
  return `/doctor/schedule/calendar?${q.toString()}`;
}

export default async function DoctorScheduleCalendar({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; appt?: string; view?: string }>;
}) {
  const { date, appt, view: viewParam } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;
  const tenantId = session!.user.tenantId!;

  const doctor = await db.doctor.findUnique({ where: { userId }, include: { user: true } });
  if (!doctor) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <EmptyState icon={UserX} message={<>No doctor profile linked to this account.</>} />
      </div>
    );
  }

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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [todaysAppointments, dayAppointments, weekAppointments, monthAppointments] = await Promise.all([
    getAppointmentsForRange(doctor.id, tenantId, todayStart, todayEnd),
    view === "day" ? getAppointmentForCalendar(doctor.id, tenantId, day) : Promise.resolve([]),
    view === "week" ? getAppointmentsForRange(doctor.id, tenantId, weekStart, weekEnd) : Promise.resolve([]),
    view === "month" ? getAppointmentsForRange(doctor.id, tenantId, monthStart, monthEnd) : Promise.resolve([]),
  ]);

  const stats = getScheduleStats(todaysAppointments);

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
      buildUrl={buildUrl}
      title="Calendar"
      subtitle={`${doctor.user.name}'s schedule`}
      backLink={{ href: "/doctor", label: "Back to schedule" }}
      secondaryLabel={(a) => a.type}
      selectedExtra={(a) => <p className="text-sm text-muted-foreground">Type: {a.type}</p>}
    />
  );
}
