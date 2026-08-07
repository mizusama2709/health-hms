import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { runFollowUpReminders } from "@/lib/followUpReminders";

async function handle(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runFollowUpReminders();
  console.log("[follow-up-reminders]", summary);

  return NextResponse.json({ ok: true, ...summary });
}

// Vercel Cron sends GET; a manual trigger or another scheduler can use
// either — both go through the same auth + job logic.
export const GET = handle;
export const POST = handle;
