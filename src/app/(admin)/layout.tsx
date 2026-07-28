import { auth } from "@/lib/auth";
import { RoleShell, type NavItem } from "@/components/layout/role-shell";

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Billing", href: "/admin/billing" },
  { label: "Ledger", href: "/admin/billing/ledger" },
  { label: "Reports", href: "/admin/reports" },
  { label: "Staff", href: "/admin/staff" },
  { label: "Organization", href: "/admin/organization" },
  { label: "Settings", href: "/admin/settings" },
  { label: "Knowledge Base", href: "/admin/knowledge-base" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <RoleShell navItems={ADMIN_NAV_ITEMS} roleLabel="Admin / Reception" userName={session?.user?.name ?? undefined}>
      {children}
    </RoleShell>
  );
}
