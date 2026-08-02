"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/layout/role-shell";
import type { LucideIcon } from "lucide-react";

export function NavGroup({
  label,
  icon: Icon,
  items,
  active = false,
}: {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  active?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(active);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold",
          active ? "text-indigo-300" : "text-white/70 hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon className={cn("size-5 shrink-0", active ? "text-indigo-300" : "text-white/50")} />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className={cn("size-4 text-white/40 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-col gap-1 py-1 pl-11">
          {items.map((child) => {
            const childActive = child.href === pathname;
            return (
              <Link
                key={child.href}
                href={child.href!}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  childActive ? "text-indigo-300" : "text-white/60 hover:text-white"
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
