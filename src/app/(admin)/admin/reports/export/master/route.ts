import { NextRequest } from "next/server";
import { requireTenantId } from "@/lib/tenant";
import { getMasterReport, getCollectionByPaymentMode } from "@/lib/reports";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(req: NextRequest) {
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
