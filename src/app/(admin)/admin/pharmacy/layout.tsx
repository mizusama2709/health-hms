import { SectionTabs } from "@/components/section-tabs";

const TABS = [
  { label: "Dashboard", href: "/admin/pharmacy" },
  { label: "Medicines", href: "/admin/pharmacy/medicines" },
  { label: "Goods Receipt", href: "/admin/pharmacy/goods-receipt" },
  { label: "Dispense / Rx Queue", href: "/admin/pharmacy/dispense" },
  { label: "Rx Templates", href: "/admin/pharmacy/rx-templates" },
  { label: "Invoices", href: "/admin/pharmacy/invoices" },
  { label: "Store Credit", href: "/admin/pharmacy/store-credit" },
  { label: "Sales Ledger", href: "/admin/pharmacy/ledger" },
  { label: "Suppliers", href: "/admin/pharmacy/suppliers" },
];

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionTabs tabs={TABS} />
      {children}
    </div>
  );
}
