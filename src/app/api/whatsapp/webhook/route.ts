import { NextRequest, NextResponse } from "next/server";
import { handleInboundWebhook } from "@/lib/whatsapp";
import { WHATSAPP_SIGNATURE_HEADER, verifyWhatsAppWebhookSignature } from "@/lib/whatsappWebhookAuth";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifyWhatsAppWebhookSignature(rawBody, req.headers.get(WHATSAPP_SIGNATURE_HEADER))) {
    return NextResponse.json({ error: "Invalid or missing webhook signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    logError("whatsapp-webhook", err, { stage: "parse" });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tenantId = payload.tenantId as string | undefined;
  const fromPhone = payload.from as string | undefined;
  const messageText = payload.text as string | undefined;

  if (!tenantId || !fromPhone || !messageText) {
    return NextResponse.json({ error: "Missing tenantId, from, or text" }, { status: 400 });
  }

  try {
    const message = await handleInboundWebhook({
      tenantId,
      fromPhone,
      messageText,
      rawPayload: payload,
    });
    return NextResponse.json({ ok: true, messageId: message.id, parsedIntent: message.parsedIntent });
  } catch (err) {
    logError("whatsapp-webhook", err, { stage: "handle", tenantId, fromPhone });
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
