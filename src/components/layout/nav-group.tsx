"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/layout/role-shell";

export function NavGroup({ label, items, defaultOpen = true }: { label: string; items: NavItem[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
      >
        {label}
        <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-2">
          {items.map((child) => (
            <Link
              key={child.href}
              href={child.href!}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
