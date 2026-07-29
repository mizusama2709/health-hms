import { auth } from "@/lib/auth";
import { RoleShell, type NavSection } from "@/components/layout/role-shell";

const PATIENT_NAV_SECTIONS: NavSection[] = [{ items: [{ label: "Dashboard", href: "/patient" }] }];

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <RoleShell navSections={PATIENT_NAV_SECTIONS} roleLabel="Patient" userName={session?.user?.name ?? undefined}>
      {children}
    </RoleShell>
  );
}
