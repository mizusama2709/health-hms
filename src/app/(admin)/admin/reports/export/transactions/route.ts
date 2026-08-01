import { NextRequest } from "next/server";
import { requireTenantId } from "@/lib/tenant";
import { listTransactions } from "@/lib/reports";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const tenantId = await requireTenantId();
  const { searchParams } = req.nextUrl;

  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

  const transactions = await listTransactions(tenantId, { from, to });

  const rows = transactions.map((t) => [
    t.paidAt.toISOString(),
    Number(t.amount).toFixed(2),
    t.mode,
    t.status,
    t.invoice.invoiceNumber,
    t.invoice.patient.user.name,
  ]);

  const csv = toCsv(["Date", "Amount", "Mode", "Status", "Invoice", "Patient"], rows);
  return csvResponse("transactions.csv", csv);
}
