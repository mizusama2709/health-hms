import { auth } from "@/lib/auth";
import { RoleShell, type NavSection } from "@/components/layout/role-shell";

const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", href: "/admin" },
      { label: "Inbox", href: "/admin/inbox" },
      { label: "Queue", href: "/admin/queue" },
    ],
  },
  {
    title: "Clinical",
    items: [
      {
        label: "Billing",
        children: [
          { label: "Bill Patient / Invoices", href: "/admin/billing" },
          { label: "Ledger", href: "/admin/billing/ledger" },
        ],
      },
    ],
  },
  {
    title: "Insights",
    items: [{ label: "Reports", href: "/admin/reports" }],
  },
  {
    title: "Admin",
    items: [
      { label: "Staff", href: "/admin/staff" },
      { label: "Organization", href: "/admin/organization" },
      { label: "Settings", href: "/admin/settings" },
      { label: "Knowledge Base", href: "/admin/knowledge-base" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <RoleShell navSections={ADMIN_NAV_SECTIONS} roleLabel="Admin / Reception" userName={session?.user?.name ?? undefined}>
      {children}
    </RoleShell>
  );
}
