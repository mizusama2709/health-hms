import { auth } from "@/lib/auth";
import { RoleShell, type NavSection } from "@/components/layout/role-shell";

const DOCTOR_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/doctor" },
      { label: "Calendar", href: "/doctor/calendar" },
    ],
  },
];

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <RoleShell navSections={DOCTOR_NAV_SECTIONS} roleLabel="Doctor" userName={session?.user?.name ?? undefined}>
      {children}
    </RoleShell>
  );
}
