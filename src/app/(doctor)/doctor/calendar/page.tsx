import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAppointmentForCalendar } from "@/lib/appointments";

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23
const HOUR_HEIGHT = 64; // px per hour row
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateParam(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatHourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "Noon";
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

  const prevMonth = new Date(day.getFullYear(), day.getMonth() - 1, 1);
  const nextMonth = new Date(day.getFullYear(), day.getMonth() + 1, 1);

  const appointments = await getAppointmentForCalendar(doctor.id, tenantId, day);
  const selected = appt ? appointments.find((a) => a.id === appt) : undefined;
  const weeks = buildMonthGrid(day);

  return (
    <div className="-m-6 flex h-[calc(100vh-0px)] min-h-[720px] overflow-hidden bg-[#18161f] text-white">
      {/* Main day view */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <Link href="/doctor" className="text-sm font-medium text-white/60 hover:text-white">
            ← Back to schedule
          </Link>
          <div className="flex items-center gap-1 rounded-full bg-white/10 p-1 text-sm">
            <span className="rounded-full bg-white/20 px-3 py-1 font-medium">Day</span>
            <span className="px-3 py-1 text-white/40">Week</span>
            <span className="px-3 py-1 text-white/40">Month</span>
            <span className="px-3 py-1 text-white/40">Year</span>
          </div>
        </div>

        <div className="px-6 pt-6 pb-2">
          <h1 className="text-4xl font-semibold">
            {day.getDate()} {day.toLocaleDateString(undefined, { month: "long" })}{" "}
            <span className="text-white/40">{day.getFullYear()}</span>
          </h1>
          <p className="mt-1 text-xl text-white/70">{day.toLocaleDateString(undefined, { weekday: "long" })}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="border-t border-white/10 py-2 text-xs uppercase tracking-wide text-white/40">all-day</div>
          <div className="relative">
            {HOURS.map((hour) => (
              <div key={hour} className="relative flex border-t border-white/10" style={{ height: HOUR_HEIGHT }}>
                <div className="w-16 shrink-0 -translate-y-2 pr-3 text-right text-xs text-white/40">
                  {formatHourLabel(hour)}
                </div>
                <div className="flex-1" />
              </div>
            ))}

            {appointments.map((a) => {
              const apptDate = new Date(a.datetime);
              const minutesFromMidnight = apptDate.getHours() * 60 + apptDate.getMinutes();
              const top = (minutesFromMidnight / 60) * HOUR_HEIGHT;
              const isSelected = a.id === appt;
              return (
                <Link
                  key={a.id}
                  href={`/doctor/calendar?date=${toDateParam(day)}&appt=${a.id}`}
                  className={`absolute left-16 right-2 flex flex-col justify-center rounded-md px-2 py-1 text-xs ${
                    isSelected ? "bg-red-500/90" : "bg-blue-500/80 hover:bg-blue-500"
                  }`}
                  style={{ top, height: Math.max(HOUR_HEIGHT / 2, 28) }}
                >
                  <span className="font-medium">{a.patient.user.name}</span>
                  <span className="text-white/80">
                    {apptDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {a.type}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="flex w-[340px] shrink-0 flex-col border-l border-white/10 px-6 py-4">
        <div className="mb-3 flex items-center justify-between">
          <Link
            href={`/doctor/calendar?date=${toDateParam(prevMonth)}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:bg-white/10"
          >
            ‹
          </Link>
          <Link
            href={`/doctor/calendar?date=${toDateParam(today)}`}
            className="rounded-full bg-white/10 px-4 py-1 text-sm font-medium hover:bg-white/20"
          >
            Today
          </Link>
          <Link
            href={`/doctor/calendar?date=${toDateParam(nextMonth)}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:bg-white/10"
          >
            ›
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-y-2 text-center text-sm">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i} className="text-xs font-medium text-white/40">
              {w}
            </div>
          ))}
          {weeks.map((week, wi) =>
            week.map((cell, di) => {
              const isToday = isSameDay(cell.date, today);
              const isSelectedDay = isSameDay(cell.date, day);
              return (
                <Link
                  key={`${wi}-${di}`}
                  href={`/doctor/calendar?date=${toDateParam(cell.date)}`}
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full ${
                    isToday
                      ? "bg-red-500 font-semibold text-white"
                      : isSelectedDay
                        ? "bg-white/20 font-semibold text-white"
                        : cell.inMonth
                          ? "text-white"
                          : "text-white/30"
                  }`}
                >
                  {cell.date.getDate()}
                </Link>
              );
            })
          )}
        </div>

        <div className="mt-8 flex-1 border-t border-white/10 pt-6">
          {selected ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">{selected.patient.user.name}</h2>
              <p className="text-sm text-white/60">
                {new Date(selected.datetime).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <p className="text-sm text-white/60">Type: {selected.type}</p>
              <p className="text-sm text-white/60">Status: {selected.status}</p>
            </div>
          ) : (
            <p className="text-center text-white/40">No Event Selected</p>
          )}
        </div>
      </div>
    </div>
  );
}
