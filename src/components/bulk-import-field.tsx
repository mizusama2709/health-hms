"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

/**
 * Medicines' bulk price update was a real CSV file upload; Patients/Leads'
 * bulk import was a bare textarea with no file option — two incompatible
 * shapes for the same "bring your own rows" task. This gives every bulk
 * import the same choice: paste rows directly, or upload a CSV with the
 * same columns. Both submit through the same `rows` field name — file
 * uploads are read client-side and dropped into the textarea rather than
 * sent as a separate file, so the server action only ever handles text.
 */
function BulkImportField({
  id,
  rowsFieldName = "rows",
  rows = 5,
  placeholder,
}: {
  id?: string;
  rowsFieldName?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [value, setValue] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setValue(await file.text());
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        id={id}
        name={rowsFieldName}
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border bg-transparent p-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
          Upload CSV instead
        </Button>
        <span className="text-xs text-muted-foreground">Fills the box above — review before saving</span>
      </div>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
    </div>
  );
}

export { BulkImportField };
