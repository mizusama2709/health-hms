import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { getSelfEfficacyReport } from "@/lib/reports";
import { toCsv, csvResponse } from "@/lib/csv";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  const tenantId = await requireTenantId();
  const { searchParams } = req.nextUrl;

  const filters = {
    from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
    to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    doctorId: searchParams.get("doctorId") || undefined,
  };

  const report = await getSelfEfficacyReport(tenantId, filters);

  await logAudit({
    tenantId,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    action: "REPORT_EXPORT",
    entityType: "SelfEfficacyExport",
    meta: { from: filters.from?.toISOString(), to: filters.to?.toISOString(), doctorId: filters.doctorId },
  });

  const rows = report.transitions.map((t) => [
    `${t.from} -> ${t.to}`,
    t.avgMinutes !== null ? t.avgMinutes.toFixed(1) : "",
    t.sampleSize,
  ]);

  const csv = toCsv(["Transition", "Avg minutes", "Sample size"], rows);
  return csvResponse("self-efficacy.csv", csv);
}
