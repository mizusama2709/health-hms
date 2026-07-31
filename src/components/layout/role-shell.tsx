import Link from "next/link";
import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
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
import { NavGroup } from "@/components/layout/nav-group";

export type NavItem = { label: string; href?: string; children?: NavItem[] };
export type NavSection = { title?: string; items: NavItem[] };

function NavLinks({ sections }: { sections: NavSection[] }) {
  return (
    <nav className="flex flex-col gap-4">
      {sections.map((section, i) => (
        <div key={section.title ?? i} className="flex flex-col gap-1">
          {section.title && (
            <div className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-white/40 uppercase">
              {section.title}
            </div>
          )}
          {section.items.map((item) =>
            item.children ? (
              <NavGroup key={item.label} label={item.label} items={item.children} />
            ) : (
              <Link
                key={item.href}
                href={item.href!}
                className="rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            )
          )}
        </div>
      ))}
    </nav>
  );
}

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
      <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#0d0e1a] p-4 md:flex">
        <div className="mb-4 px-2">
          <div className="text-sm font-semibold text-white">Health HMS</div>
          <div className="text-xs text-white/50">{roleLabel}</div>
        </div>
        <NavLinks sections={navSections} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger
                className={cn(buttonVariants({ variant: "outline", size: "icon" }), "md:hidden")}
              >
                <Menu className="size-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 overflow-y-auto bg-[#0d0e1a] p-4">
                <SheetHeader>
                  <SheetTitle className="text-white">{roleLabel}</SheetTitle>
                </SheetHeader>
                <Separator className="my-3 bg-white/10" />
                <NavLinks sections={navSections} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium md:hidden">Health HMS</span>
          </div>

          <div className="flex items-center gap-3">
            {userName && <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>}
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 overflow-x-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
