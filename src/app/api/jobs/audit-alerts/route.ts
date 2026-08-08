import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { runAuditAlerts } from "@/lib/auditAlerts";
import { logError, logInfo } from "@/lib/logger";

async function handle(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runAuditAlerts();
    logInfo("audit-alerts", "job completed", summary);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    logError("audit-alerts", err);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}

// Vercel Cron sends GET; a manual trigger or another scheduler can use
// either — both go through the same auth + job logic.
export const GET = handle;
export const POST = handle;
