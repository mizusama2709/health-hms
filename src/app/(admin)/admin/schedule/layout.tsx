import { SectionTabs } from "@/components/section-tabs";
import { Breadcrumb } from "@/components/breadcrumb";

const TABS = [
  { label: "Calendar", href: "/admin/schedule/calendar" },
  { label: "Appointments", href: "/admin/schedule/appointments" },
  { label: "Follow-ups", href: "/admin/schedule/reminders" },
];

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Home", href: "/admin" }, { label: "Schedule" }]} />
      <SectionTabs tabs={TABS} />
      {children}
    </div>
  );
}
