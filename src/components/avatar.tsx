import { cn } from "@/lib/utils";

// Fixed categorical order, never reassigned by rank — the same name always
// lands on the same color regardless of which other names are in the list.
const COLORS = [
  "bg-blue-500/15 text-blue-400",
  "bg-emerald-500/15 text-emerald-400",
  "bg-violet-500/15 text-violet-400",
  "bg-amber-500/15 text-amber-400",
  "bg-rose-500/15 text-rose-400",
  "bg-cyan-500/15 text-cyan-400",
  "bg-fuchsia-500/15 text-fuchsia-400",
  "bg-lime-500/15 text-lime-400",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

const SIZE = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
} as const;

/**
 * Deterministic initials avatar — same name always gets the same color, so
 * a patient/doctor/staff member reads consistently across every list they
 * appear in without storing an actual avatar color anywhere.
 */
function Avatar({ name, size = "md", className }: { name: string; size?: keyof typeof SIZE; className?: string }) {
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold", SIZE[size], hashColor(name), className)}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export { Avatar };
