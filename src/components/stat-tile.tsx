import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/utils";

const CHIP_COLOR = {
  blue: "bg-blue-500/10 text-blue-400",
  emerald: "bg-emerald-500/10 text-emerald-400",
  amber: "bg-amber-500/10 text-amber-400",
  red: "bg-red-500/10 text-red-400",
  violet: "bg-violet-500/10 text-violet-400",
  slate: "bg-slate-500/10 text-slate-400",
} as const;

const TEXT_COLOR = {
  blue: "text-blue-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
  violet: "text-violet-400",
  slate: "text-slate-400",
} as const;

type IconColor = keyof typeof CHIP_COLOR;

/**
 * The one stat-tile shape for the app — matches the Card-based pattern
 * already used correctly on Reports/Pharmacy Dashboard, standardizing away
 * the raw `<div className="rounded-lg border p-4">` tiles that had drifted
 * onto the Dashboard and Appointments list. `icon`/`iconColor` add the
 * colored-chip treatment; `sparkline` is optional and only worth passing
 * where a real short trend series is already at hand (don't fabricate one).
 */
export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  iconColor = "blue",
  sparkline,
  valueClassName,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  iconColor?: IconColor;
  sparkline?: number[];
  valueClassName?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-0">
        <div className="flex items-start justify-between gap-2 pt-4">
          <p className="text-xs text-muted-foreground">{label}</p>
          {Icon && (
            <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", CHIP_COLOR[iconColor])}>
              <Icon className="size-4" />
            </div>
          )}
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p className={cn("text-2xl font-semibold", valueClassName)}>{value}</p>
          {sparkline && sparkline.length > 1 && <Sparkline values={sparkline} className={cn("h-6 w-16 shrink-0", TEXT_COLOR[iconColor])} />}
        </div>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
