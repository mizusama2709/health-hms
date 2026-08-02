import { NextRequest } from "next/server";
import { requireTenantId } from "@/lib/tenant";
import { getSelfEfficacyReport } from "@/lib/reports";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const tenantId = await requireTenantId();
  const { searchParams } = req.nextUrl;

  const filters = {
    from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
    to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    doctorId: searchParams.get("doctorId") || undefined,
  };

  const report = await getSelfEfficacyReport(tenantId, filters);

  const rows = report.transitions.map((t) => [
    `${t.from} -> ${t.to}`,
    t.avgMinutes !== null ? t.avgMinutes.toFixed(1) : "",
    t.sampleSize,
  ]);

  const csv = toCsv(["Transition", "Avg minutes", "Sample size"], rows);
  return csvResponse("self-efficacy.csv", csv);
}
