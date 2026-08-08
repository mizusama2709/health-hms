import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { getMasterReport, getCollectionByPaymentMode } from "@/lib/reports";
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

  const [master, collection] = await Promise.all([
    getMasterReport(tenantId, filters),
    getCollectionByPaymentMode(tenantId, filters),
  ]);

  await logAudit({
    tenantId,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    action: "REPORT_EXPORT",
    entityType: "MasterReportExport",
    meta: { from: filters.from?.toISOString(), to: filters.to?.toISOString(), doctorId: filters.doctorId },
  });

  const rows: unknown[][] = [
    ["Total appointments", master.totalAppointments],
    ["Consultations", master.consultations],
    ["Pharmacy", master.pharmacy],
    ["Lab", master.lab],
    ["Total revenue", master.totalRevenue],
    ["Total discounts", master.totalDiscounts],
    ["Total refunds", master.totalRefunds],
    [],
    ["Payment mode", "Amount", "Percent"],
    ...collection.byMode.map((m) => [m.mode, m.amount, `${m.percent}%`]),
  ];

  const csv = toCsv(["Metric", "Value"], rows);
  return csvResponse("master-report.csv", csv);
}
