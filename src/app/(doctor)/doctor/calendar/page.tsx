import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAppointmentForCalendar } from "@/lib/appointments";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23
const HOUR_HEIGHT = 64; // px per hour row
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const VIEW_TABS = ["Day", "Week", "Month", "Year"] as const;

function toDateParam(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatHourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function buildMonthGrid(monthAnchor: Date) {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

  const weeks: { date: Date; inMonth: boolean }[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: { date: Date; inMonth: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({ date: new Date(cursor), inMonth: cursor.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default async function DoctorCalendar({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; appt?: string }>;
}) {
  const { date, appt } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;
  const tenantId = session!.user.tenantId!;

  const doctor = await db.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">No doctor profile linked to this account.</p>
      </div>
    );
  }

  const today = new Date();
  const day = date ? new Date(date) : today;
  const isToday = isSameDay(day, today);

  const prev = new Date(day);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);
  const prevMonth = new Date(day.getFullYear(), day.getMonth() - 1, 1);
  const nextMonth = new Date(day.getFullYear(), day.getMonth() + 1, 1);

  const appointments = await getAppointmentForCalendar(doctor.id, tenantId, day);
  const selected = appt ? appointments.find((a) => a.id === appt) : undefined;
  const weeks = buildMonthGrid(day);

  const now = new Date();
  const nowOffset = isToday ? ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT : null;

  return (
    <div className="-m-6 flex h-[calc(100vh-1px)] min-h-[720px] overflow-hidden bg-background">
      {/* Main day view */}
      <div className="flex flex-1 flex-col overflow-hidden border-r">
        <div className="flex items-center justify-between border-b px-6 py-3">
          <Link href="/doctor" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Back to schedule
          </Link>
          <div className="flex items-center gap-1 rounded-full bg-muted p-1 text-sm">
            {VIEW_TABS.map((tab) =>
              tab === "Day" ? (
                <span key={tab} className="rounded-full bg-background px-3 py-1 font-medium shadow-sm">
                  {tab}
                </span>
              ) : (
                <span key={tab} className="px-3 py-1 text-muted-foreground/60">
                  {tab}
                </span>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/doctor/calendar?date=${toDateParam(prev)}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              ‹
            </Link>
            <Link href={`/doctor/calendar?date=${toDateParam(today)}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Today
            </Link>
            <Link href={`/doctor/calendar?date=${toDateParam(next)}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              ›
            </Link>
          </div>
        </div>

        <div className="px-6 pt-5 pb-3">
          <p className="text-sm font-medium text-muted-foreground">
            {day.toLocaleDateString(undefined, { weekday: "long" })}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {day.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
            <span className="ml-2 text-muted-foreground/50">{day.getFullYear()}</span>
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10">
          <div className="relative">
            {HOURS.map((hour) => (
              <div key={hour} className="relative flex" style={{ height: HOUR_HEIGHT }}>
                <div className="w-14 shrink-0 -translate-y-2 pr-3 text-right text-[11px] text-muted-foreground/70">
                  {formatHourLabel(hour)}
                </div>
                <div className="relative flex-1 border-t" />
              </div>
            ))}

            {nowOffset !== null && (
              <div className="pointer-events-none absolute left-14 right-0 flex items-center" style={{ top: nowOffset }}>
                <div className="h-2 w-2 -translate-x-1 rounded-full bg-red-500" />
                <div className="h-px flex-1 bg-red-500" />
              </div>
            )}

            {appointments.map((a) => {
              const apptDate = new Date(a.datetime);
              const minutesFromMidnight = apptDate.getHours() * 60 + apptDate.getMinutes();
              const top = (minutesFromMidnight / 60) * HOUR_HEIGHT;
              const isSelected = a.id === appt;
              return (
                <Link
                  key={a.id}
                  href={`/doctor/calendar?date=${toDateParam(day)}&appt=${a.id}`}
                  className={cn(
                    "absolute left-14 right-2 flex flex-col justify-center overflow-hidden rounded-lg border-l-4 px-3 py-1 text-xs shadow-sm transition-colors",
                    isSelected
                      ? "border-l-primary bg-primary text-primary-foreground"
                      : "border-l-blue-500 bg-blue-50 text-blue-900 hover:bg-blue-100"
                  )}
                  style={{ top, height: Math.max(HOUR_HEIGHT / 2, 30) }}
                >
                  <span className="truncate font-medium">{a.patient.user.name}</span>
                  <span className={cn("truncate", isSelected ? "text-primary-foreground/80" : "text-blue-900/70")}>
                    {apptDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {a.type}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="flex w-[320px] shrink-0 flex-col bg-muted/30 px-5 py-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <Link
            href={`/doctor/calendar?date=${toDateParam(prevMonth)}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            ‹
          </Link>
          <span className="text-sm font-semibold">{day.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <Link
            href={`/doctor/calendar?date=${toDateParam(nextMonth)}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            ›
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i} className="pb-1 text-[11px] font-medium text-muted-foreground/60">
              {w}
            </div>
          ))}
          {weeks.map((week, wi) =>
            week.map((cell, di) => {
              const isTodayCell = isSameDay(cell.date, today);
              const isSelectedDay = isSameDay(cell.date, day);
              return (
                <Link
                  key={`${wi}-${di}`}
                  href={`/doctor/calendar?date=${toDateParam(cell.date)}`}
                  className={cn(
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm",
                    isTodayCell
                      ? "bg-red-500 font-semibold text-white"
                      : isSelectedDay
                        ? "border border-primary font-semibold text-foreground"
                        : cell.inMonth
                          ? "text-foreground hover:bg-muted"
                          : "text-muted-foreground/40"
                  )}
                >
                  {cell.date.getDate()}
                </Link>
              );
            })
          )}
        </div>

        <div className="mt-6 flex-1 border-t pt-5">
          {selected ? (
            <div className="flex flex-col gap-2 rounded-lg bg-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">{selected.patient.user.name}</h2>
                <StatusBadge status={selected.status} type="appointment" />
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(selected.datetime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="text-sm text-muted-foreground">Type: {selected.type}</p>
            </div>
          ) : (
            <p className="pt-8 text-center text-sm text-muted-foreground/60">No Event Selected</p>
          )}
        </div>
      </div>
    </div>
  );
}
