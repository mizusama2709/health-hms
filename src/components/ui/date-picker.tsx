"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

function toDateParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateParam(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function buildMonthGrid(anchor: Date) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

  const days: { date: Date; inMonth: boolean }[] = [];
  const cursor = new Date(gridStart);
  for (let i = 0; i < 42; i++) {
    days.push({ date: new Date(cursor), inMonth: cursor.getMonth() === month });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * A calendar-popover date field bound to a hidden `<input type="date">`, so
 * it still participates in native `<form action={serverAction}>` + FormData
 * submission exactly like NativeSelect/SearchableSelect — this only
 * replaces the *picking* UI, not the form-integration contract, since the
 * browser's native date input is inconsistent across platforms and clunky
 * for the date-range filters this app uses on Reports/Ledger.
 */
function DatePicker({
  name,
  defaultValue,
  placeholder = "Pick a date",
  className,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = React.useState(defaultValue ?? "");
  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState(() => parseDateParam(defaultValue ?? "") ?? new Date());

  const selected = parseDateParam(value);
  const days = buildMonthGrid(viewMonth);
  const today = new Date();

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={value} />
      <PopoverPrimitive.Trigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-40 justify-start gap-2 font-normal",
          !value && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="size-3.5" />
        {selected ? selected.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : placeholder}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner side="bottom" align="start" sideOffset={6}>
          <PopoverPrimitive.Popup className="z-50 w-64 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                aria-label="Previous month"
                className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
                onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm font-medium">
                {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                aria-label="Next month"
                className="flex size-6 items-center justify-center rounded-md hover:bg-muted"
                onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] text-muted-foreground">
              {WEEKDAY_LABELS.map((w, i) => (
                <div key={i} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {days.map(({ date, inMonth }) => {
                const isSelected = selected && date.toDateString() === selected.toDateString();
                const isToday = date.toDateString() === today.toDateString();
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => {
                      setValue(toDateParam(date));
                      setOpen(false);
                    }}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md text-sm",
                      !inMonth && "text-muted-foreground/40",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isToday
                          ? "border border-primary/40"
                          : "hover:bg-muted"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
            {value && (
              <button
                type="button"
                className="mt-2 w-full rounded-md py-1 text-center text-xs text-muted-foreground hover:bg-muted"
                onClick={() => {
                  setValue("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
            )}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export { DatePicker };
