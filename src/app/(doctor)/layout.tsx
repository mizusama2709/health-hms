import { auth } from "@/lib/auth";
import { RoleShell, type NavItem } from "@/components/layout/role-shell";

const DOCTOR_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/doctor" },
  { label: "Calendar", href: "/doctor/calendar" },
];

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <RoleShell navItems={DOCTOR_NAV_ITEMS} roleLabel="Doctor" userName={session?.user?.name ?? undefined}>
      {children}
    </RoleShell>
  );
}
