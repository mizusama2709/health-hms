"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/layout/role-shell";
import type { LucideIcon } from "lucide-react";

export function NavGroup({
  label,
  icon: Icon,
  items,
  activeHref,
}: {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  activeHref: string | null;
}) {
  const active = items.some((c) => c.href === activeHref);
  const [open, setOpen] = useState(active);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold",
          active
            ? "text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        <Icon className={cn("size-5 shrink-0", active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/50")} />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className={cn("size-4 text-sidebar-foreground/40 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-col gap-1 py-1 pl-11">
          {items.map((child) => {
            const childActive = child.href === activeHref;
            return (
              <Link
                key={child.href}
                href={child.href!}
                className={cn(
                  "rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors",
                  childActive
                    ? "border-sidebar-primary text-sidebar-accent-foreground"
                    : "border-transparent text-sidebar-foreground/60 hover:text-sidebar-foreground"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
