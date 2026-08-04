import { Menu } from "lucide-react";
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

export type NavItem = { label: string; href?: string; children?: NavItem[] };
export type NavSection = { title?: string; items: NavItem[] };

export function RoleShell({
  navSections,
  roleLabel,
  userName,
  children,
}: {
  navSections: NavSection[];
  roleLabel: string;
  userName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="mb-2 px-2">
          <div className="text-sm font-semibold text-sidebar-foreground">Health HMS</div>
          <div className="text-xs text-sidebar-foreground/50">{roleLabel}</div>
        </div>
        <NavLinks sections={navSections} />
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
