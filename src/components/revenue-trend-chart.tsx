"use client";

import * as React from "react";

type Point = { date: Date; revenue: number };

const WIDTH = 640;
const HEIGHT = 160;
const PAD_X = 16;
const PAD_Y = 20;

/**
 * Single-series area chart — one hue (the accent), light fill under a solid
 * line, recessive baseline, hover reveals exact date + amount. Replaces the
 * Reports page's plain %-width divs with a real chart for the one metric on
 * that page that's actually a time series (daily revenue), following the
 * same hand-rolled SVG + hover pattern as lab-trend-chart.tsx.
 */
function RevenueTrendChart({ points }: { points: Point[] }) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const values = points.map((p) => p.revenue);
  const max = Math.max(1, ...values);

  const coords = points.map((p, i) => ({
    x: PAD_X + (i / Math.max(1, points.length - 1)) * (WIDTH - PAD_X * 2),
    y: HEIGHT - PAD_Y - (p.revenue / max) * (HEIGHT - PAD_Y * 2),
    ...p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? PAD_X} ${HEIGHT - PAD_Y} L ${coords[0]?.x ?? PAD_X} ${HEIGHT - PAD_Y} Z`;
  const active = activeIndex !== null ? coords[activeIndex] : null;

  const total = values.reduce((s, v) => s + v, 0);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">Revenue trend</span>
        <span className="text-muted-foreground">Total ₹{Math.round(total).toLocaleString("en-IN")}</span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={`Daily revenue across ${points.length} days, total ₹${Math.round(total).toLocaleString("en-IN")}`}
        >
          <line x1={PAD_X} y1={HEIGHT - PAD_Y} x2={WIDTH - PAD_X} y2={HEIGHT - PAD_Y} className="stroke-border" strokeWidth={1} />
          <path d={areaPath} className="fill-primary/10" />
          <path d={linePath} fill="none" className="stroke-primary" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {coords.map((c, i) => (
            <g key={i}>
              <rect
                x={c.x - (WIDTH - PAD_X * 2) / Math.max(1, points.length) / 2}
                y={0}
                width={(WIDTH - PAD_X * 2) / Math.max(1, points.length)}
                height={HEIGHT}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(i)}
                onBlur={() => setActiveIndex(null)}
                tabIndex={0}
                className="cursor-pointer outline-none"
              />
              {i === coords.length - 1 && (
                <circle cx={c.x} cy={c.y} r={3} className="fill-primary stroke-background pointer-events-none" strokeWidth={2} />
              )}
            </g>
          ))}
        </svg>
        {active && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md"
            style={{ left: `${(active.x / WIDTH) * 100}%`, top: `${(active.y / HEIGHT) * 100}%` }}
          >
            <span className="font-medium">₹{Math.round(active.revenue).toLocaleString("en-IN")}</span> ·{" "}
            {active.date.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
          </div>
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{points[0]?.date.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</span>
        <span>{points[points.length - 1]?.date.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</span>
      </div>
    </div>
  );
}

export { RevenueTrendChart };
export type { Point as RevenueTrendPoint };
