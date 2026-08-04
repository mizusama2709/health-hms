import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyLabReportToken } from "@/lib/labReportUrlSigning";

// Publicly reachable by id (an unguessable cuid) — this is the link sent to
// the patient over WhatsApp and shown on the patient's chart. No session is
// required since the patient has no portal login to attach one to; a
// signed, time-limited token (see labReportUrlSigning.ts) takes its place
// so the link isn't permanent/unrevocable if it ever leaks.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!verifyLabReportToken(id, req.nextUrl.searchParams.get("token"))) {
    return NextResponse.json({ error: "This link is invalid or has expired" }, { status: 401 });
  }

  const report = await db.labReport.findUnique({ where: { id } });
  if (!report || !report.pdfData) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(report.pdfData), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="lab-report-${id}.pdf"`,
    },
  });
}
