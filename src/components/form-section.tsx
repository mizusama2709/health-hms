import { cn } from "@/lib/utils";

/**
 * A light label + rule to break a long flat stack of fields into scannable
 * groups (e.g. "Address" / "Booking policy" within one settings form) —
 * cheaper than splitting into separate Cards when the fields still belong
 * to one submission.
 */
export function FormSection({ title, className }: { title: string; className?: string }) {
  return (
    <div className={cn("mt-2 flex items-center gap-2 first:mt-0", className)}>
      <span className="shrink-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
