"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { LabResultFlag } from "@prisma/client";

// Same validated status set as lab-result-gauge.tsx (validate_palette.js) —
// one shade for both modes.
const FLAG_DOT: Record<LabResultFlag, string> = {
  NORMAL: "fill-emerald-500",
  ABNORMAL: "fill-amber-500",
  CRITICAL: "fill-red-500",
};

type Point = { date: Date; value: number; flag: LabResultFlag | null };

const WIDTH = 320;
const HEIGHT = 96;
const PAD_X = 12;
const PAD_Y = 16;

/**
 * A single-series trend line for one test across visits — no legend (one
 * series, the heading already says what it is); a neutral stroke carries the
 * shape, dots carry status color; hover/focus reveals the exact value and
 * date per point, per the dataviz interaction defaults.
 */
function LabTrendChart({ testName, unit, points }: { testName: string; unit: string | null; points: Point[] }) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const values = sorted.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = sorted.map((p, i) => ({
    x: PAD_X + (i / Math.max(1, sorted.length - 1)) * (WIDTH - PAD_X * 2),
    y: HEIGHT - PAD_Y - ((p.value - min) / span) * (HEIGHT - PAD_Y * 2),
    ...p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const active = activeIndex !== null ? coords[activeIndex] : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{testName}</span>
        <span className="text-muted-foreground">{unit ?? ""}</span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={`${testName} trend across ${sorted.length} visits`}
        >
          <line
            x1={PAD_X}
            y1={HEIGHT - PAD_Y}
            x2={WIDTH - PAD_X}
            y2={HEIGHT - PAD_Y}
            className="stroke-border"
            strokeWidth={1}
          />
          <path d={linePath} fill="none" className="stroke-muted-foreground" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {coords.map((c, i) => (
            <g key={i}>
              {/* transparent hit target, larger than the visible dot */}
              <circle
                cx={c.x}
                cy={c.y}
                r={12}
                fill="transparent"
                tabIndex={0}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(i)}
                onBlur={() => setActiveIndex(null)}
                className="cursor-pointer outline-none"
              />
              <circle
                cx={c.x}
                cy={c.y}
                r={4}
                className={cn(c.flag ? FLAG_DOT[c.flag] : "fill-muted-foreground", "stroke-background pointer-events-none")}
                strokeWidth={2}
              />
            </g>
          ))}
        </svg>
        {active && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md"
            style={{ left: `${(active.x / WIDTH) * 100}%`, top: `${(active.y / HEIGHT) * 100}%` }}
          >
            <span className="font-medium">
              {active.value} {unit}
            </span>{" "}
            · {active.date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        )}
      </div>
    </div>
  );
}

export { LabTrendChart };
export type { Point as LabTrendPoint };
