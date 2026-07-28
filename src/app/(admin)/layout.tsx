import { auth } from "@/lib/auth";
import { RoleShell, type NavSection } from "@/components/layout/role-shell";

const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", href: "/admin" },
      { label: "Patients", href: "/admin/patients" },
      { label: "Inbox", href: "/admin/inbox" },
      {
        label: "Schedule",
        children: [{ label: "Reminders", href: "/admin/schedule/reminders" }],
      },
      { label: "Queue", href: "/admin/queue" },
    ],
  },
  {
    title: "Clinical",
    items: [
      { label: "Services", href: "/admin/services" },
      {
        label: "Billing",
        children: [
          { label: "Bill Patient / Invoices", href: "/admin/billing" },
          { label: "Ledger", href: "/admin/billing/ledger" },
        ],
      },
      {
        label: "Lab",
        children: [
          { label: "Lab Tests", href: "/admin/lab/tests" },
          { label: "Lab Orders", href: "/admin/lab/orders" },
          { label: "Upload Report", href: "/admin/lab/reports/upload" },
          { label: "Report Templates", href: "/admin/lab/templates" },
        ],
      },
      {
        label: "Pharmacy",
        children: [
          { label: "Dashboard", href: "/admin/pharmacy" },
          { label: "Medicines", href: "/admin/pharmacy/medicines" },
          { label: "Goods Receipt", href: "/admin/pharmacy/goods-receipt" },
          { label: "Dispense / Rx Queue", href: "/admin/pharmacy/dispense" },
          { label: "Invoices", href: "/admin/pharmacy/invoices" },
          { label: "Store Credit", href: "/admin/pharmacy/store-credit" },
          { label: "Sales Ledger", href: "/admin/pharmacy/ledger" },
          { label: "Suppliers", href: "/admin/pharmacy/suppliers" },
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
