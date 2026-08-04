"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavIcon } from "@/components/layout/nav-icons";
import { NavGroup } from "@/components/layout/nav-group";
import type { NavSection } from "@/components/layout/role-shell";

export function NavLinks({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {sections.map((section, i) => (
        <div key={section.title ?? i} className="flex flex-col gap-1">
          {section.title && (
            <div className="px-3 pt-5 pb-1 text-xs font-semibold tracking-wider text-sidebar-foreground/40 uppercase">
              {section.title}
            </div>
          )}
          {section.items.map((item) => {
            const Icon = getNavIcon(item.label);
            if (item.children) {
              return (
                <NavGroup
                  key={item.label}
                  label={item.label}
                  icon={Icon}
                  items={item.children}
                  active={item.children.some((c) => c.href && pathname.startsWith(c.href))}
                />
              );
            }
            const active = item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("size-5 shrink-0", active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/50")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
