import { createHmac, timingSafeEqual } from "node:crypto";

// Meta's webhook convention (also followed by most other WhatsApp Business
// API providers): the request body is signed with an HMAC-SHA256 keyed by a
// shared app secret, sent as `X-Hub-Signature-256: sha256=<hex>`. Verifying
// this is what stops anyone who can reach the endpoint (it has no session
// auth — it's called by an external provider, not a logged-in user) from
// injecting fabricated inbound messages, including ones that auto-book real
// appointments.
export const WHATSAPP_SIGNATURE_HEADER = "x-hub-signature-256";

export function verifyWhatsAppWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) return false; // fail closed — an unconfigured secret must never mean "accept anything"
  if (!signatureHeader) return false;

  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}
