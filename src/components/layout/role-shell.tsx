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

export type NavItem = { label: string; href: string };

function NavLinks({ items }: { items: NavItem[] }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function RoleShell({
  navItems,
  roleLabel,
  userName,
  children,
}: {
  navItems: NavItem[];
  roleLabel: string;
  userName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-muted/30 p-4 md:flex">
        <div className="mb-4 px-2">
          <div className="text-sm font-semibold">Health HMS</div>
          <div className="text-xs text-muted-foreground">{roleLabel}</div>
        </div>
        <NavLinks items={navItems} />
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
              <SheetContent side="left" className="w-64 p-4">
                <SheetHeader>
                  <SheetTitle>{roleLabel}</SheetTitle>
                </SheetHeader>
                <Separator className="my-3" />
                <NavLinks items={navItems} />
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
