import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The one stat-tile shape for the app — matches the Card-based pattern
 * already used correctly on Reports/Pharmacy Dashboard, standardizing away
 * the raw `<div className="rounded-lg border p-4">` tiles that had drifted
 * onto the Dashboard and Appointments list.
 */
export function StatTile({
  label,
  value,
  sub,
  valueClassName,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-0">
        <p className="pt-4 text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold", valueClassName)}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
