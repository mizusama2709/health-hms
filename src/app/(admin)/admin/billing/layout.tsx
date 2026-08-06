import { SectionTabs } from "@/components/section-tabs";

const TABS = [
  { label: "Bill Patient", href: "/admin/billing" },
  { label: "Invoices", href: "/admin/billing/invoices" },
  { label: "Consolidated Ledger", href: "/admin/billing/ledger" },
];

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionTabs tabs={TABS} />
      {children}
    </div>
  );
}
