import { NextRequest, NextResponse } from "next/server";
import { handleInboundWebhook } from "@/lib/whatsapp";
import { WHATSAPP_SIGNATURE_HEADER, verifyWhatsAppWebhookSignature } from "@/lib/whatsappWebhookAuth";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifyWhatsAppWebhookSignature(rawBody, req.headers.get(WHATSAPP_SIGNATURE_HEADER))) {
    return NextResponse.json({ error: "Invalid or missing webhook signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

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
