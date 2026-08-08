import { SectionTabs } from "@/components/section-tabs";
import { Breadcrumb } from "@/components/breadcrumb";

const TABS = [
  { label: "Calendar", href: "/doctor/schedule/calendar" },
  { label: "Appointments", href: "/doctor/schedule/appointments" },
  { label: "Reminders", href: "/doctor/schedule/reminders" },
];

export default function DoctorScheduleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Home", href: "/doctor" }, { label: "Schedule" }]} />
      <SectionTabs tabs={TABS} />
      {children}
    </div>
  );
}
