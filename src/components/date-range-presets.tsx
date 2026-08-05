import Link from "next/link";
import { cn } from "@/lib/utils";

function toDateParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
] as const;

/**
 * "Last N days" quick-select for the from/to date filters that show up on
 * every report-style page — plain links (not JS state), consistent with
 * every other filter chip in the app (all GET-form based), so it works
 * without a client component and composes with whatever other query params
 * the page already carries.
 */
export function DateRangePresets({
  basePath,
  otherParams = {},
  activeFrom,
  activeTo,
}: {
  basePath: string;
  otherParams?: Record<string, string | undefined>;
  activeFrom?: string;
  activeTo?: string;
}) {
  const today = new Date();

  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((preset) => {
        const from = new Date(today);
        from.setDate(from.getDate() - (preset.days - 1));
        const fromParam = toDateParam(from);
        const toParam = toDateParam(today);

        const q = new URLSearchParams();
        for (const [key, value] of Object.entries(otherParams)) {
          if (value) q.set(key, value);
        }
        q.set("from", fromParam);
        q.set("to", toParam);

        const isActive = activeFrom === fromParam && activeTo === toParam;

        return (
          <Link
            key={preset.label}
            href={`${basePath}?${q.toString()}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              isActive ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            Last {preset.label}
          </Link>
        );
      })}
    </div>
  );
}
