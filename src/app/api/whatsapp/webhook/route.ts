import { NextRequest, NextResponse } from "next/server";
import { handleInboundWebhook } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  const tenantId = payload.tenantId as string | undefined;
  const fromPhone = payload.from as string | undefined;
  const messageText = payload.text as string | undefined;

  if (!tenantId || !fromPhone || !messageText) {
    return NextResponse.json({ error: "Missing tenantId, from, or text" }, { status: 400 });
  }

  const message = await handleInboundWebhook({
    tenantId,
    fromPhone,
    messageText,
    rawPayload: payload,
  });

  return NextResponse.json({ ok: true, messageId: message.id, parsedIntent: message.parsedIntent });
}
