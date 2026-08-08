"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavIcon } from "@/components/layout/nav-icons";
import { NavGroup } from "@/components/layout/nav-group";
import type { NavSection, NavItem } from "@/components/layout/role-shell";

function matchesPath(pathname: string, href: string) {
  return href === pathname || (href !== "/" && pathname.startsWith(href + "/"));
}

// A parent route like "/admin" is itself a path prefix of every other admin
// route, so naive prefix matching lit up "Dashboard" on every single page.
// Instead, find the single longest matching href across the whole nav tree
// — the most specific route wins, and every other item (including any
// shorter-prefix ancestor) is simply not active.
function findActiveHref(sections: NavSection[], pathname: string): string | null {
  let best: string | null = null;
  for (const section of sections) {
    for (const item of section.items) {
      const candidates: NavItem[] = item.children ?? [item];
      for (const c of candidates) {
        if (c.href && matchesPath(pathname, c.href) && (best === null || c.href.length > best.length)) {
          best = c.href;
        }
      }
    }
  }
  return best;
}

export function NavLinks({ sections, collapsed }: { sections: NavSection[]; collapsed?: boolean }) {
  const pathname = usePathname();
  const activeHref = findActiveHref(sections, pathname);

  return (
    <nav className="flex flex-col gap-1">
      {sections.map((section, i) => (
        <div key={section.title ?? i} className="flex flex-col gap-1">
          {section.title && !collapsed && (
            <div className="px-3 pt-5 pb-1 text-xs font-semibold tracking-wider text-sidebar-foreground/40 uppercase">
              {section.title}
            </div>
          )}
          {section.title && collapsed && <div className="mx-2 mt-4 mb-1 border-t border-sidebar-border" />}
          {section.items.map((item) => {
            const Icon = getNavIcon(item.label);
            if (item.children) {
              return (
                <NavGroup
                  key={item.label}
                  label={item.label}
                  icon={Icon}
                  items={item.children}
                  activeHref={activeHref}
                  collapsed={collapsed}
                />
              );
            }
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href!}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl border-l-2 border-transparent px-3 py-3 text-sm font-semibold transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "rounded-l-none border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("size-5 shrink-0", active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/50")} />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {!!item.badge && (
                      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-500 tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && !!item.badge && <span className="absolute top-1 right-3 size-2 rounded-full bg-amber-500" />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
