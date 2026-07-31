import { auth } from "@/lib/auth";
import { RoleShell, type NavSection } from "@/components/layout/role-shell";

const DOCTOR_NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/doctor" },
      {
        label: "Schedule",
        children: [
          { label: "Calendar", href: "/doctor/schedule/calendar" },
          { label: "Appointments", href: "/doctor/schedule/appointments" },
          { label: "Reminders", href: "/doctor/schedule/reminders" },
        ],
      },
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
