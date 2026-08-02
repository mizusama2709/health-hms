import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { LabResultFlag } from "@prisma/client";

// Validated via the dataviz skill's validate_palette.js: this 3-color status
// set clears CVD separation, normal-vision floor, and contrast (>=3:1) in
// both light and dark mode against the app's surfaces — one shade works for
// both rather than a lighter dark-mode variant.
const FLAG_COLOR: Record<LabResultFlag, string> = {
  NORMAL: "bg-emerald-500",
  ABNORMAL: "bg-amber-500",
  CRITICAL: "bg-red-500",
};

const FLAG_BADGE_CLASS: Record<LabResultFlag, string> = {
  NORMAL: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  ABNORMAL: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function parseRange(referenceRange: string | null): { low: number; high: number } | null {
  if (!referenceRange) return null;
  const match = referenceRange.match(/^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const low = Number(match[1]);
  const high = Number(match[2]);
  if (!Number.isFinite(low) || !Number.isFinite(high) || low >= high) return null;
  return { low, high };
}

/**
 * A single lab result plotted against its reference range — a static "meter"
 * (no series over time, so no hover layer needed per the dataviz method).
 * Falls back to a plain badge when the value or range can't be parsed as
 * numbers (e.g. "Positive"/"Negative" results) rather than rendering a
 * misleading bar.
 */
function LabResultGauge({
  testName,
  resultValue,
  resultUnit,
  referenceRange,
  flag,
}: {
  testName: string;
  resultValue: string | null;
  resultUnit: string | null;
  referenceRange: string | null;
  flag: LabResultFlag | null;
}) {
  const value = resultValue !== null ? Number(resultValue) : NaN;
  const range = parseRange(referenceRange);
  const canPlot = Number.isFinite(value) && range !== null;

  const dotColor = flag ? FLAG_COLOR[flag] : "bg-muted-foreground";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{testName}</span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {resultValue ?? "—"} {resultUnit ?? ""}
          {flag && (
            <Badge variant="outline" className={cn("border-transparent font-medium", FLAG_BADGE_CLASS[flag])}>
              {flag}
            </Badge>
          )}
        </span>
      </div>
      {canPlot ? (
        <div className="relative h-1.5 w-full rounded-full bg-muted">
          <div
            className={cn("absolute top-1/2 size-3 -translate-y-1/2 -translate-x-1/2 rounded-full ring-2 ring-background", dotColor)}
            style={{
              left: `${Math.min(100, Math.max(0, ((value - range!.low) / (range!.high - range!.low)) * 100))}%`,
            }}
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{range ? range.low : ""}</span>
        <span>{referenceRange ? `Reference: ${referenceRange}` : "No reference range on file"}</span>
        <span>{range ? range.high : ""}</span>
      </div>
    </div>
  );
}

export { LabResultGauge };
