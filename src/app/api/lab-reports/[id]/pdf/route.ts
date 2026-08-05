import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// Publicly reachable by id (an unguessable cuid) — this is the link sent to
// the patient over WhatsApp and shown on the patient's chart. No session is
// required since the patient has no portal login to attach one to.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const report = await db.labReport.findUnique({ where: { id }, include: { labOrder: true } });
  if (!report || !report.pdfData) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  await logAudit({
    tenantId: report.labOrder.tenantId,
    action: "LAB_REPORT_VIEW",
    entityType: "LabReport",
    entityId: id,
  });

  return new NextResponse(Buffer.from(report.pdfData), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="lab-report-${id}.pdf"`,
    },
  });
}
