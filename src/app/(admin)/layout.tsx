import { auth } from "@/lib/auth";
import { getNavBadgeCounts } from "@/lib/navBadges";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { isAdminRouteAllowed } from "@/lib/roles";
import { RoleShell, type NavSection, type NavItem } from "@/components/layout/role-shell";
import type { Role } from "@prisma/client";

const ROLE_LABELS: Partial<Record<Role, string>> = {
  RECEPTIONIST: "Reception",
  NURSE: "Nurse",
  LAB: "Lab",
  PHARMACIST: "Pharmacist",
};

// Prunes any link (or group child) the role's route allowlist wouldn't let
// it open, so a hidden link and a blocked route never drift apart — a
// group with no surviving children is dropped entirely, and so is a
// section left with no items.
function filterNavSectionsForRole(sections: NavSection[], role: Role): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item): NavItem | null => {
          if (item.children) {
            const children = item.children.filter((c) => isAdminRouteAllowed(role, c.href!));
            return children.length > 0 ? { ...item, children } : null;
          }
          return item.href && isAdminRouteAllowed(role, item.href) ? item : null;
        })
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((section) => section.items.length > 0);
}

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
  const role = session?.user?.role as Role | undefined;
  const tenantId = session?.user?.tenantId;
  const [badges, unreadNotificationCount] = await Promise.all([
    tenantId ? getNavBadgeCounts(tenantId) : Promise.resolve({ unpricedMedicines: 0, pendingLabOrders: 0 }),
    tenantId && session?.user?.id ? getUnreadNotificationCount(tenantId, session.user.id) : Promise.resolve(0),
  ]);
  const adminNavSections = buildAdminNavSections(badges);
  const navSections = role ? filterNavSectionsForRole(adminNavSections, role) : adminNavSections;

  return (
    <RoleShell
      navSections={navSections}
      roleLabel={(role && ROLE_LABELS[role]) ?? "Admin"}
      userName={session?.user?.name ?? undefined}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </RoleShell>
  );
}
