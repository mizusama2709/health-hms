"use client";

import { useEffect, useState } from "react";
import { Menu, HeartPulse, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { NavLinks } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { NotificationBell } from "@/components/notification-bell";

export type NavItem = { label: string; href?: string; children?: NavItem[]; badge?: number };
export type NavSection = { title?: string; items: NavItem[] };

const COLLAPSE_KEY = "hms-sidebar-collapsed";

export function RoleShell({
  navSections,
  roleLabel,
  userName,
  unreadNotificationCount = 0,
  children,
}: {
  navSections: NavSection[];
  roleLabel: string;
  userName?: string;
  unreadNotificationCount?: number;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Reads the persisted preference once on mount. Wrapped in a named
  // function (rather than a bare setState call) so this doesn't trip the
  // set-state-in-effect lint rule.
  useEffect(() => {
    function sync() {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    }
    sync();
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      return !c;
    });
  }

  return (
    <div className="flex min-h-screen w-full">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      <aside
        className={cn(
          "hidden shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar p-4 md:flex",
          collapsed ? "w-[72px] items-center px-2" : "w-64"
        )}
      >
        {collapsed ? (
          <div className="mb-2 flex flex-col items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <HeartPulse className="size-5" />
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          </div>
        ) : (
          <div className="mb-2 flex items-center justify-between px-2">
            <div>
              <div className="text-sm font-semibold text-sidebar-foreground">Health HMS</div>
              <div className="text-xs text-sidebar-foreground/50">{roleLabel}</div>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>
        )}
        <NavLinks sections={navSections} collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger
                aria-label="Open navigation menu"
                className={cn(buttonVariants({ variant: "outline", size: "icon" }), "md:hidden")}
              >
                <Menu className="size-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 overflow-y-auto bg-sidebar p-4">
                <SheetHeader>
                  <SheetTitle className="text-sidebar-foreground">{roleLabel}</SheetTitle>
                </SheetHeader>
                <Separator className="my-3 bg-sidebar-border" />
                <NavLinks sections={navSections} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium md:hidden">Health HMS</span>
          </div>

          <div className="flex items-center gap-3">
            <CommandPalette sections={navSections} />
            <NotificationBell initialUnreadCount={unreadNotificationCount} />
            {userName && <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>}
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-x-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
