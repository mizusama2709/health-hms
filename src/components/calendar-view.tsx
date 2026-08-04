import Link from "next/link";
import type { ReactNode } from "react";
import type { AppointmentStatus } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export type View = "day" | "week" | "month";

export type CalendarAppointment = {
  id: string;
  datetime: Date;
  status: AppointmentStatus;
  type: string;
  patient: { user: { name: string } };
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 64;
const WEEK_HOUR_HEIGHT = 48;
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function toDateParam(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatHourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function startOfWeek(d: Date) {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

export function buildMonthGrid(monthAnchor: Date) {
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

export type ScheduleStats = {
  bookedCount: number;
  bookedHours: number;
  freeHours: number;
  workingHoursLabel: string;
  status: string;
};

/**
 * Shared day/week/month schedule grid — the admin and doctor calendar pages
 * were ~400-line near-duplicates differing only in data scope (all doctors
 * vs one), an optional doctor filter, and how each appointment's secondary
 * line is labeled ("Dr. X" vs the appointment type). Everything else —
 * hour-row layout, the now-line, month-grid math — was byte-for-byte
 * identical, so it lives here once and each page.tsx supplies the parts
 * that differ.
 */
export function CalendarView<T extends CalendarAppointment>({
  view,
  day,
  today,
  weekStart,
  weekEnd,
  weekDays,
  monthWeeks,
  dayAppointments,
  weekAppointments,
  monthAppointments,
  selectedAppointmentId,
  stats,
  buildUrl,
  title,
  subtitle,
  backLink,
  filterBar,
  secondaryLabel,
  selectedExtra,
}: {
  view: View;
  day: Date;
  today: Date;
  weekStart: Date;
  weekEnd: Date;
  weekDays: Date[];
  monthWeeks: { date: Date; inMonth: boolean }[][];
  dayAppointments: T[];
  weekAppointments: T[];
  monthAppointments: T[];
  selectedAppointmentId?: string;
  stats: ScheduleStats;
  buildUrl: (view: View, date: Date, appt?: string) => string;
  title: string;
  subtitle: string;
  backLink?: { href: string; label: string };
  filterBar?: ReactNode;
  secondaryLabel: (a: T) => string;
  selectedExtra: (a: T) => ReactNode;
}) {
  const isToday = isSameDay(day, today);
  const prev = new Date(day);
  const next = new Date(day);
  if (view === "day") {
    prev.setDate(prev.getDate() - 1);
    next.setDate(next.getDate() + 1);
  } else if (view === "week") {
    prev.setDate(prev.getDate() - 7);
    next.setDate(next.getDate() + 7);
  } else {
    prev.setMonth(prev.getMonth() - 1);
    next.setMonth(next.getMonth() + 1);
  }

  const selected =
    selectedAppointmentId && view === "day" ? dayAppointments.find((a) => a.id === selectedAppointmentId) : undefined;

  const now = new Date();
  const nowOffset = isToday ? ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT : null;
  const nowOffsetWeek = ((now.getHours() * 60 + now.getMinutes()) / 60) * WEEK_HOUR_HEIGHT;

  const appointmentsByDay = new Map<string, T[]>();
  for (const a of [...weekAppointments, ...monthAppointments]) {
    const key = new Date(a.datetime).toDateString();
    if (!appointmentsByDay.has(key)) appointmentsByDay.set(key, []);
    appointmentsByDay.get(key)!.push(a);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {backLink && (
            <Link href={backLink.href} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              ← {backLink.label}
            </Link>
          )}
          <h1 className={cn("text-2xl font-semibold", backLink && "mt-1")}>{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {filterBar}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Today booked</p>
          <p className="mt-1 text-2xl font-semibold">{stats.bookedCount}</p>
          <p className="text-xs text-muted-foreground">{stats.bookedHours.toFixed(1)}h</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Today free</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{stats.freeHours.toFixed(1)}h</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Working hours</p>
          <p className="mt-1 text-2xl font-semibold">{stats.workingHoursLabel}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold",
              stats.status === "Available" ? "text-emerald-600" : stats.status === "In consultation" ? "text-amber-600" : "text-muted-foreground"
            )}
          >
            {stats.status}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href={buildUrl(view, prev)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              ‹
            </Link>
            <Link href={buildUrl(view, next)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              ›
            </Link>
            <Link href={buildUrl(view, today)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Today
            </Link>
          </div>
          <div className="text-sm font-semibold">
            {view === "day" && day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {view === "week" &&
              `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
            {view === "month" && day.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted p-1 text-sm">
            {(["day", "week", "month"] as View[]).map((v) => (
              <Link
                key={v}
                href={buildUrl(v, day)}
                className={cn(
                  "rounded-full px-3 py-1 capitalize",
                  v === view ? "bg-background font-medium shadow-sm" : "text-muted-foreground/60"
                )}
              >
                {v}
              </Link>
            ))}
          </div>
        </div>

        {/* DAY VIEW */}
        {view === "day" && (
          <div className="flex">
            <div className="max-h-[640px] flex-1 overflow-y-auto px-4 py-4">
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

                {dayAppointments.map((a) => {
                  const apptDate = new Date(a.datetime);
                  const minutesFromMidnight = apptDate.getHours() * 60 + apptDate.getMinutes();
                  const top = (minutesFromMidnight / 60) * HOUR_HEIGHT;
                  const isSelected = a.id === selectedAppointmentId;
                  return (
                    <Link
                      key={a.id}
                      href={buildUrl("day", day, a.id)}
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
                        {apptDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {secondaryLabel(a)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="w-[280px] shrink-0 border-l bg-muted/30 px-4 py-4">
              {selected ? (
                <div className="flex flex-col gap-2 rounded-lg bg-background p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">{selected.patient.user.name}</h2>
                    <StatusBadge status={selected.status} type="appointment" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selected.datetime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  {selectedExtra(selected)}
                </div>
              ) : (
                <p className="pt-8 text-center text-sm text-muted-foreground/60">No event selected</p>
              )}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {view === "week" && (
          <div className="max-h-[640px] overflow-y-auto">
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b text-center text-xs font-medium">
              <div />
              {weekDays.map((d) => (
                <Link
                  key={d.toISOString()}
                  href={buildUrl("day", d)}
                  className={cn("border-l px-2 py-2 hover:bg-muted/50", isSameDay(d, today) && "text-red-500")}
                >
                  {WEEKDAY_SHORT[d.getDay()]} {d.getMonth() + 1}/{d.getDate()}
                </Link>
              ))}
            </div>

            <div className="relative grid grid-cols-[56px_repeat(7,1fr)]">
              <div>
                {HOURS.map((hour) => (
                  <div key={hour} className="relative -translate-y-2 pr-2 text-right text-[10px] text-muted-foreground/70" style={{ height: WEEK_HOUR_HEIGHT }}>
                    {formatHourLabel(hour)}
                  </div>
                ))}
              </div>
              {weekDays.map((d) => {
                const dayAppts = appointmentsByDay.get(d.toDateString()) ?? [];
                return (
                  <div key={d.toISOString()} className="relative border-l">
                    {HOURS.map((hour) => (
                      <div key={hour} className="border-t" style={{ height: WEEK_HOUR_HEIGHT }} />
                    ))}
                    {isSameDay(d, today) && (
                      <div className="pointer-events-none absolute left-0 right-0 h-px bg-red-500" style={{ top: nowOffsetWeek }} />
                    )}
                    {dayAppts.map((a) => {
                      const apptDate = new Date(a.datetime);
                      const minutesFromMidnight = apptDate.getHours() * 60 + apptDate.getMinutes();
                      const top = (minutesFromMidnight / 60) * WEEK_HOUR_HEIGHT;
                      return (
                        <Link
                          key={a.id}
                          href={buildUrl("day", d, a.id)}
                          className="absolute left-0.5 right-0.5 overflow-hidden rounded border-l-2 border-l-blue-500 bg-blue-50 px-1 py-0.5 text-[10px] text-blue-900 hover:bg-blue-100"
                          style={{ top, height: Math.max(WEEK_HOUR_HEIGHT / 2, 20) }}
                        >
                          <div className="truncate font-medium">{apptDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                          <div className="truncate">{a.patient.user.name}</div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MONTH VIEW */}
        {view === "month" && (
          <div>
            <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
              {WEEKDAY_LABELS.map((w, i) => (
                <div key={i} className="py-2">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthWeeks.map((week, wi) =>
                week.map((cell, di) => {
                  const cellAppts = appointmentsByDay.get(cell.date.toDateString()) ?? [];
                  const isTodayCell = isSameDay(cell.date, today);
                  return (
                    <Link
                      key={`${wi}-${di}`}
                      href={buildUrl("day", cell.date)}
                      className={cn(
                        "flex min-h-[100px] flex-col gap-1 border-b border-l p-2 hover:bg-muted/40",
                        !cell.inMonth && "bg-muted/20 text-muted-foreground/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          isTodayCell && "bg-red-500 text-white"
                        )}
                      >
                        {cell.date.getDate()}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {cellAppts.slice(0, 2).map((a) => (
                          <span key={a.id} className="truncate rounded bg-blue-50 px-1 py-0.5 text-[10px] text-blue-900">
                            {new Date(a.datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {a.patient.user.name}
                          </span>
                        ))}
                        {cellAppts.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{cellAppts.length - 2} more</span>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
