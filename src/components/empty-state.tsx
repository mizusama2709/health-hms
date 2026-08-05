import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared "nothing here" treatment — a bare line of muted text reads like an
 * unfinished placeholder. An icon + message (still no illustration, kept
 * lightweight) makes an intentionally-empty list look designed rather than
 * broken.
 */
export function EmptyState({
  icon: Icon,
  message,
  className,
}: {
  icon: LucideIcon;
  message: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 py-10 text-center", className)}>
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
