import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { runFollowUpReminders } from "@/lib/followUpReminders";
import { logError, logInfo } from "@/lib/logger";

async function handle(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runFollowUpReminders();
    logInfo("follow-up-reminders", "job completed", summary);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    logError("follow-up-reminders", err);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}

// Vercel Cron sends GET; a manual trigger or another scheduler can use
// either — both go through the same auth + job logic.
export const GET = handle;
export const POST = handle;
