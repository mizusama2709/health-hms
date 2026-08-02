import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusKind = "appointment" | "invoice" | "user" | "payment" | "patient" | "lead";

const COLOR_MAP: Record<StatusKind, Record<string, string>> = {
  appointment: {
    BOOKED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    CANCELLED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    NO_SHOW: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  invoice: {
    UNPAID: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    PARTIALLY_PAID: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    PAID: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    VOID: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  user: {
    ACTIVE: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    INACTIVE: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  payment: {
    SUCCESS: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    REFUNDED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    PARTIALLY_REFUNDED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  patient: {
    payment_pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    payment_collected: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    appointment_booked: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    follow_up: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    new: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  lead: {
    ENQUIRY: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    SYMPTOMS_COLLECTED: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    DOCTOR_RECOMMENDED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
    PAYMENT_PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    PAYMENT_COLLECTED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    APPOINTMENT_BOOKED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    FOLLOW_UP: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    CONVERTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
};

export function StatusBadge({ status, type }: { status: string; type: StatusKind }) {
  const colorClass = COLOR_MAP[type][status] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";

  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", colorClass)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
