"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/layout/role-shell";
import type { LucideIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

function Badge({ value }: { value: number }) {
  return (
    <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-500 tabular-nums">
      {value}
    </span>
  );
}

function ChildLink({ child, activeHref }: { child: NavItem; activeHref: string | null }) {
  const childActive = child.href === activeHref;
  return (
    <Link
      key={child.href}
      href={child.href!}
      className={cn(
        "flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors",
        childActive
          ? "border-sidebar-primary text-sidebar-accent-foreground"
          : "border-transparent text-sidebar-foreground/60 hover:text-sidebar-foreground"
      )}
    >
      <span className="flex-1">{child.label}</span>
      {!!child.badge && <Badge value={child.badge} />}
    </Link>
  );
}

export function NavGroup({
  label,
  icon: Icon,
  items,
  activeHref,
  collapsed,
}: {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  activeHref: string | null;
  collapsed?: boolean;
}) {
  const active = items.some((c) => c.href === activeHref);
  const [open, setOpen] = useState(active);
  const totalBadge = items.reduce((sum, item) => sum + (item.badge ?? 0), 0);

  if (collapsed) {
    return (
      <Popover>
        <PopoverTrigger
          title={label}
          className={cn(
            "relative flex w-full items-center justify-center rounded-xl py-3",
            active
              ? "text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <Icon className={cn("size-5 shrink-0", active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/50")} />
          {totalBadge > 0 && (
            <span className="absolute top-1 right-2 size-2 rounded-full bg-amber-500" />
          )}
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={12} className="w-56 p-1">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{label}</div>
          <div className="flex flex-col gap-0.5">
            {items.map((child) => {
              const childActive = child.href === activeHref;
              return (
                <Link
                  key={child.href}
                  href={child.href!}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium",
                    childActive ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent"
                  )}
                >
                  <span className="flex-1">{child.label}</span>
                  {!!child.badge && <Badge value={child.badge} />}
                </Link>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

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
        {totalBadge > 0 && <Badge value={totalBadge} />}
        <ChevronDown className={cn("size-4 text-sidebar-foreground/40 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-col gap-1 py-1 pl-11">
          {items.map((child) => (
            <ChildLink key={child.href} child={child} activeHref={activeHref} />
          ))}
        </div>
      )}
    </div>
  );
}
