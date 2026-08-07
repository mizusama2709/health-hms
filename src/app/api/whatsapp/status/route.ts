import { NextRequest, NextResponse } from "next/server";
import { handleStatusWebhook } from "@/lib/whatsapp";
import { WHATSAPP_SIGNATURE_HEADER, verifyWhatsAppWebhookSignature } from "@/lib/whatsappWebhookAuth";

// Meta sends delivery-status updates (sent/delivered/read/failed) to the
// same webhook subscription as inbound messages, distinguished by payload
// shape (a "statuses" array instead of "messages") — kept as its own route
// rather than branching inside api/whatsapp/webhook so each stays a single
// clear responsibility. Same signature verification as the inbound route.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifyWhatsAppWebhookSignature(rawBody, req.headers.get(WHATSAPP_SIGNATURE_HEADER))) {
    return NextResponse.json({ error: "Invalid or missing webhook signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const applied = await handleStatusWebhook(payload);

  return NextResponse.json({ ok: true, updated: applied.length });
}
