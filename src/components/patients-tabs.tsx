"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Both tab panels' data are already fetched unconditionally server-side
// (see patients/page.tsx), and the filter forms inside each panel are real
// GET submissions that need to land back on the right tab — so switching
// still does a full navigation (matching the previous plain-<Link> tabs
// exactly), just gaining real keyboard/ARIA tab semantics from the shared
// Tabs component instead of two unstyled links.
export function PatientsTabs({ tab, children }: { tab: "patients" | "enquiry"; children: React.ReactNode }) {
  const router = useRouter();

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        router.push(value === "enquiry" ? "/admin/patients?tab=enquiry" : "/admin/patients");
      }}
    >
      <TabsList variant="line">
        <TabsTrigger value="patients">Patients</TabsTrigger>
        <TabsTrigger value="enquiry">Enquiry</TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
}
