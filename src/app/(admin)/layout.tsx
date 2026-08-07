import { auth } from "@/lib/auth";
import { getNavBadgeCounts } from "@/lib/navBadges";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { RoleShell, type NavSection } from "@/components/layout/role-shell";

function buildAdminNavSections(badges: { unpricedMedicines: number; pendingLabOrders: number }): NavSection[] {
  return [
    {
      title: "Workspace",
      items: [
        { label: "Dashboard", href: "/admin" },
        { label: "Patients", href: "/admin/patients" },
        { label: "Inbox", href: "/admin/inbox" },
        {
          label: "Schedule",
          children: [
            { label: "Calendar", href: "/admin/schedule/calendar" },
            { label: "Appointments", href: "/admin/schedule/appointments" },
            { label: "Follow-ups", href: "/admin/schedule/reminders" },
          ],
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
            { label: "Bill Patient", href: "/admin/billing" },
            { label: "Invoices", href: "/admin/billing/invoices" },
            { label: "Consolidated Ledger", href: "/admin/billing/ledger" },
          ],
        },
        {
          label: "Lab",
          children: [
            { label: "Lab Tests", href: "/admin/lab/tests" },
            { label: "Lab Orders", href: "/admin/lab/orders", badge: badges.pendingLabOrders },
            { label: "Lab Reports", href: "/admin/lab/reports/upload" },
            { label: "Report Templates", href: "/admin/lab/templates" },
          ],
        },
        {
          label: "Imaging",
          children: [{ label: "Imaging Orders", href: "/admin/imaging/orders" }],
        },
        {
          label: "Pharmacy",
          children: [
            { label: "Dashboard", href: "/admin/pharmacy" },
            { label: "Medicines", href: "/admin/pharmacy/medicines", badge: badges.unpricedMedicines },
            { label: "Goods Receipt", href: "/admin/pharmacy/goods-receipt" },
            { label: "Dispense / Rx Queue", href: "/admin/pharmacy/dispense" },
            { label: "Rx Templates", href: "/admin/pharmacy/rx-templates" },
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
      items: [
        { label: "Reports", href: "/admin/reports" },
      ],
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
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isReceptionist = session?.user?.role === "RECEPTIONIST";
  const tenantId = session?.user?.tenantId;
  const [badges, unreadNotificationCount] = await Promise.all([
    tenantId ? getNavBadgeCounts(tenantId) : Promise.resolve({ unpricedMedicines: 0, pendingLabOrders: 0 }),
    tenantId && session?.user?.id ? getUnreadNotificationCount(tenantId, session.user.id) : Promise.resolve(0),
  ]);
  const adminNavSections = buildAdminNavSections(badges);
  const navSections = isReceptionist ? adminNavSections.slice(0, 1) : adminNavSections;

  return (
    <RoleShell
      navSections={navSections}
      roleLabel={isReceptionist ? "Reception" : "Admin"}
      userName={session?.user?.name ?? undefined}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </RoleShell>
  );
}
