function escapeCsvCell(value: unknown): string {
  let str = value === null || value === undefined ? "" : String(value);

  // CSV/formula injection (CWE-1236): a cell opening with one of these
  // characters is interpreted as a formula by Excel/Sheets when the file is
  // opened, letting attacker-influenceable data (e.g. a patient name from
  // self-registration or a WhatsApp lead) execute arbitrary formulas/DDE
  // payloads on whoever opens the export. A leading apostrophe is the
  // standard mitigation — it forces the cell to be read as literal text.
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;

  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  return lines.join("\n");
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
