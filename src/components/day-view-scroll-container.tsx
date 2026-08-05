"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The day/week views used to always render scrolled to 12 AM, so opening
 * them meant scrolling past 8+ empty hours before reaching the clinic's
 * actual working hours (or, on today, the current time). Scrolls itself
 * into a useful starting position right after mount — a plain DOM
 * scrollTop write, not React state, so there's nothing to reconcile on
 * re-render.
 */
export function DayViewScrollContainer({
  scrollToHour,
  hourHeight,
  className,
  children,
}: {
  scrollToHour: number;
  hourHeight: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = scrollToHour * hourHeight;
    }
  }, [scrollToHour, hourHeight]);

  return (
    <div ref={ref} className={cn("max-h-[640px] overflow-y-auto", className)}>
      {children}
    </div>
  );
}
