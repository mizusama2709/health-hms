"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type ChartAlert = {
  testName: string;
  resultValue: string | null;
  resultUnit: string | null;
  flag: "CRITICAL" | "ABNORMAL";
};

// All 6 sections' data are already fetched together server-side (one page
// load), so switching tabs is a pure client-side state flip — no need for
// URL sync like the Patients list (nothing here reloads via a GET form).
// Kept as one client component (rather than passing the alert banner as an
// opaque server-rendered node) specifically so its "View in Labs" button
// can drive the same tab state the TabsList does.
export function PatientChartTabs({
  alerts,
  history,
  vitals,
  labs,
  imaging,
  efficacy,
  profile,
}: {
  alerts: ChartAlert[];
  history: React.ReactNode;
  vitals: React.ReactNode;
  labs: React.ReactNode;
  imaging: React.ReactNode;
  efficacy: React.ReactNode;
  profile: React.ReactNode;
}) {
  const [tab, setTab] = useState("history");
  const hasCritical = alerts.some((a) => a.flag === "CRITICAL");

  return (
    <div className="flex flex-col gap-4">
      {alerts.length > 0 && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm",
            hasCritical
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
          )}
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span className="font-medium">
            {alerts.length} {hasCritical ? "critical" : "abnormal"} result{alerts.length === 1 ? "" : "s"} in the most
            recent lab order:
          </span>
          <span className="flex-1">
            {alerts
              .map((a) => `${a.testName}${a.resultValue ? ` (${a.resultValue}${a.resultUnit ?? ""})` : ""}`)
              .join(", ")}
          </span>
          <button
            type="button"
            onClick={() => setTab("labs")}
            className="shrink-0 rounded-md border border-current/30 px-2 py-1 text-xs font-medium hover:bg-current/10"
          >
            View in Labs →
          </button>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="labs">Labs</TabsTrigger>
          <TabsTrigger value="imaging">Imaging</TabsTrigger>
          <TabsTrigger value="efficacy">Efficacy</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="history" className="mt-4">
          {history}
        </TabsContent>
        <TabsContent value="vitals" className="mt-4">
          {vitals}
        </TabsContent>
        <TabsContent value="labs" className="mt-4">
          {labs}
        </TabsContent>
        <TabsContent value="imaging" className="mt-4">
          {imaging}
        </TabsContent>
        <TabsContent value="efficacy" className="mt-4">
          {efficacy}
        </TabsContent>
        <TabsContent value="profile" className="mt-4">
          {profile}
        </TabsContent>
      </Tabs>
    </div>
  );
}
