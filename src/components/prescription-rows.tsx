"use client";

import * as React from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";

const DOSE_TIMES = [
  { value: "MORNING", label: "Morning" },
  { value: "AFTERNOON", label: "Afternoon" },
  { value: "EVENING", label: "Evening" },
  { value: "NIGHT", label: "Night" },
] as const;

let nextRowKey = 0;

/**
 * Prescription line items used to be a fixed 5-row form — a 6th medicine had
 * nowhere to go, and empty rows still submitted (silently skipped server-side).
 * Rows here are added/removed on the client and always re-indexed 0..N-1 on
 * submit via `name={medicineId_${i}}`, so the server action just reads
 * `rowCount` instead of a hardcoded row limit.
 */
function PrescriptionRows({ search }: { search: (query: string) => Promise<{ value: string; label: string }[]> }) {
  const [rowKeys, setRowKeys] = React.useState<number[]>(() => [nextRowKey++]);

  return (
    <>
      <input type="hidden" name="rowCount" value={rowKeys.length} />
      {rowKeys.map((key, i) => (
        <div key={key} className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Medicine</span>
            <SearchableSelect name={`medicineId_${i}`} placeholder="Search medicines by name…" search={search} className="w-56" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Quantity</span>
            <Input name={`quantity_${i}`} type="number" min={1} className="w-20" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Dose times</span>
            <div className="flex gap-2">
              {DOSE_TIMES.map((dt) => (
                <label key={dt.value} className="flex items-center gap-1 text-xs">
                  <input type="checkbox" name={`doseTimes_${i}`} value={dt.value} />
                  {dt.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Duration</span>
            <div className="flex gap-1">
              <Input name={`durationValue_${i}`} type="number" min={1} className="w-16" />
              <NativeSelect name={`durationUnit_${i}`} defaultValue="" className="w-28">
                <option value="">—</option>
                <option value="DAYS">Days</option>
                <option value="WEEKS">Weeks</option>
                <option value="MONTHS">Months</option>
              </NativeSelect>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Note (optional)</span>
            <Input name={`dosageInstructions_${i}`} className="w-36" placeholder="e.g. after food" />
          </div>
          {rowKeys.length > 1 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setRowKeys((keys) => keys.filter((k) => k !== key))}
            >
              Remove
            </Button>
          )}
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => setRowKeys((keys) => [...keys, nextRowKey++])}>
        + Add another medicine
      </Button>
    </>
  );
}

export { PrescriptionRows };
