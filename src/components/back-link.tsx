import Link from "next/link";
import { cn } from "@/lib/utils";

export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("text-sm font-medium text-primary hover:underline", className)}>
      ← Back to {label}
    </Link>
  );
}
