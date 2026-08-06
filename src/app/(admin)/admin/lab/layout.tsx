import { SectionTabs } from "@/components/section-tabs";

const TABS = [
  { label: "Lab Tests", href: "/admin/lab/tests" },
  { label: "Lab Orders", href: "/admin/lab/orders" },
  { label: "Lab Reports", href: "/admin/lab/reports/upload" },
  { label: "Report Templates", href: "/admin/lab/templates" },
];

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionTabs tabs={TABS} />
      {children}
    </div>
  );
}
