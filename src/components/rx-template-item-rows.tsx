"use client";

import * as React from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

let nextRowKey = 0;

/**
 * The template's medicine list used to be a hardcoded 2-slot form (medicineId0/1)
 * with a 3rd medicine having nowhere to go. The server action already reads
 * every same-named field via formData.getAll("medicineId") etc. (index-aligned
 * across the three arrays), so any number of repeated-name rows works without
 * touching the action — this just adds/removes rows on the client.
 */
function RxTemplateItemRows({ search }: { search: (query: string) => Promise<{ value: string; label: string }[]> }) {
  const [rowKeys, setRowKeys] = React.useState<number[]>(() => [nextRowKey++, nextRowKey++]);

  return (
    <div className="flex flex-col gap-2">
      {rowKeys.map((key, i) => (
        <div key={key} className="flex flex-col gap-2 rounded-md border bg-muted/30 p-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Medicine ({i === 0 ? "1st item" : `item ${i + 1}${i > 0 ? " — optional" : ""}`})
            </p>
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
          <Label htmlFor={`medicineId-${key}`}>Medicine</Label>
          <SearchableSelect
            id={`medicineId-${key}`}
            name="medicineId"
            required={i === 0}
            placeholder={i === 0 ? "Search medicines by name…" : "Search medicines by name… (optional)"}
            search={search}
          />
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor={`quantity-${key}`}>Quantity</Label>
              <Input id={`quantity-${key}`} name="quantity" type="number" min={1} defaultValue={1} required={i === 0} />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor={`dosage-${key}`}>Dosage instructions</Label>
              <Input id={`dosage-${key}`} name="dosageInstructions" placeholder="optional" />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="self-start"
        onClick={() => setRowKeys((keys) => [...keys, nextRowKey++])}
      >
        + Add another medicine
      </Button>
    </div>
  );
}

export { RxTemplateItemRows };
