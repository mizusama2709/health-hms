import { describe, it, expect, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWhatsAppWebhookSignature } from "@/lib/whatsappWebhookAuth";

// Regression tests: the WhatsApp inbound webhook has no session auth (it's
// called by an external provider, not a logged-in user), so signature
// verification is the only thing stopping anyone who can reach the endpoint
// from injecting fabricated inbound messages — including ones that
// auto-book real appointments for a guessed tenantId.

const originalSecret = process.env.WHATSAPP_WEBHOOK_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.WHATSAPP_WEBHOOK_SECRET;
  else process.env.WHATSAPP_WEBHOOK_SECRET = originalSecret;
});

function sign(secret: string, body: string) {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyWhatsAppWebhookSignature", () => {
  it("accepts a correctly signed body", () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = "test-secret";
    const body = JSON.stringify({ tenantId: "t1", from: "+1", text: "book" });
    expect(verifyWhatsAppWebhookSignature(body, sign("test-secret", body))).toBe(true);
  });

  it("rejects a missing signature header", () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = "test-secret";
    expect(verifyWhatsAppWebhookSignature("{}", null)).toBe(false);
  });

  it("rejects a signature computed with the wrong secret", () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = "test-secret";
    const body = "{}";
    expect(verifyWhatsAppWebhookSignature(body, sign("wrong-secret", body))).toBe(false);
  });

  it("rejects a tampered body even with a validly-formed signature", () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = "test-secret";
    const signedBody = JSON.stringify({ tenantId: "t1", text: "book" });
    const signature = sign("test-secret", signedBody);
    const tamperedBody = JSON.stringify({ tenantId: "t1", text: "book more appointments" });
    expect(verifyWhatsAppWebhookSignature(tamperedBody, signature)).toBe(false);
  });

  it("fails closed when no webhook secret is configured at all", () => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET;
    const body = "{}";
    // Even a "signature" that would trivially match an empty/undefined
    // secret must not be accepted — an unconfigured secret must mean
    // "reject everything," never "accept anything."
    expect(verifyWhatsAppWebhookSignature(body, sign("", body))).toBe(false);
  });
});
