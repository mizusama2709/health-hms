"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SectionTab = { label: string; href: string };

// Real <Link> elements (not the base-ui Tabs primitive) since these route to
// genuinely separate pages — keeping native middle-click/open-in-new-tab/
// prefetch behavior matters more here than it does for the same-route panel
// switches on Reports/Patients.
export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const pathname = usePathname();

  // A child route (e.g. /admin/pharmacy/medicines/batches) can match more
  // than one tab's href as a prefix — pick the longest match so only one
  // tab is ever active, and so a section's root tab doesn't light up for
  // every sibling underneath it.
  const activeHref = tabs
    .map((tab) => tab.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label="Section" className="flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => {
        const isActive = tab.href === activeHref;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}
