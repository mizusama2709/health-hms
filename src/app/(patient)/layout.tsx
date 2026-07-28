import { auth } from "@/lib/auth";
import { RoleShell, type NavItem } from "@/components/layout/role-shell";

const PATIENT_NAV_ITEMS: NavItem[] = [{ label: "Dashboard", href: "/patient" }];

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <RoleShell navItems={PATIENT_NAV_ITEMS} roleLabel="Patient" userName={session?.user?.name ?? undefined}>
      {children}
    </RoleShell>
  );
}
