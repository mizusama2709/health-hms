import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { runAuditAlerts } from "@/lib/auditAlerts";

async function handle(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runAuditAlerts();
  console.log("[audit-alerts]", summary);

  return NextResponse.json({ ok: true, ...summary });
}

// Vercel Cron sends GET; a manual trigger or another scheduler can use
// either — both go through the same auth + job logic.
export const GET = handle;
export const POST = handle;
