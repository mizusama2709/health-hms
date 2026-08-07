import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { listTransactions } from "@/lib/reports";
import { toCsv, csvResponse } from "@/lib/csv";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  const tenantId = await requireTenantId();
  const { searchParams } = req.nextUrl;

  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

  const transactions = await listTransactions(tenantId, { from, to });

  // Per-patient financial rows leaving the app as a file — the kind of
  // bulk access an audit trail exists to catch, distinct from any single
  // page view.
  await logAudit({
    tenantId,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    action: "REPORT_EXPORT",
    entityType: "TransactionsExport",
    meta: { from: from?.toISOString(), to: to?.toISOString(), rowCount: transactions.length },
  });

  const rows = transactions.map((t) => [
    t.paidAt.toISOString(),
    Number(t.amount).toFixed(2),
    Number(t.invoice.subtotal).toFixed(2),
    (Number(t.invoice.cgstAmount) + Number(t.invoice.sgstAmount)).toFixed(2),
    Number(t.invoice.discountAmount).toFixed(2),
    t.mode,
    t.status,
    t.invoice.invoiceNumber,
    t.invoice.patient.user.name,
  ]);

  const csv = toCsv(
    ["Date", "Amount", "Taxable", "GST", "Discount", "Mode", "Status", "Invoice", "Patient"],
    rows
  );
  return csvResponse("transactions.csv", csv);
}
