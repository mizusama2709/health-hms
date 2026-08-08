import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyDocumentToken, type DocumentType } from "@/lib/documentUrlSigning";
import { logAudit } from "@/lib/audit";

const VALID_TYPES = new Set<DocumentType>(["invoice", "prescription", "consultation_summary"]);

// Same unauthenticated-but-signed-token shape as api/lab-reports/[id]/pdf —
// see documentUrlSigning.ts. Lab reports keep their own dedicated route
// (their own table, pre-existing); this one route covers the three newer
// document types via the [type] segment instead of three near-identical
// route folders.
export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;

  if (!VALID_TYPES.has(type as DocumentType)) {
    return NextResponse.json({ error: "Unknown document type" }, { status: 404 });
  }
  const documentType = type as DocumentType;

  if (!verifyDocumentToken(documentType, id, req.nextUrl.searchParams.get("token"))) {
    return NextResponse.json({ error: "This link is invalid or has expired" }, { status: 401 });
  }

  const document = await db.generatedDocument.findFirst({ where: { id, type: documentType } });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await logAudit({
    tenantId: document.tenantId,
    action: "DOCUMENT_VIEW",
    entityType: documentType,
    entityId: id,
  });

  return new NextResponse(Buffer.from(document.pdfData), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${documentType}-${id}.pdf"`,
    },
  });
}
