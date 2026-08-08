import { describe, it, expect, vi, afterEach } from "vitest";
import { MetaWhatsAppProvider } from "@/lib/whatsapp/metaProvider";

// Regression coverage for the real WhatsApp Cloud API integration — no
// live Meta credentials exist in this environment, so these verify the
// request shape and response handling against a mocked fetch instead.
// (Live verification needs a real Meta Business account + approved
// message templates — see the "known limitation" comment in metaProvider.ts.)

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("MetaWhatsAppProvider", () => {
  it("sends a normalized phone number and returns SENT with the provider's message id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.TEST123" }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new MetaWhatsAppProvider("test-token", "123456");
    const result = await provider.sendMessage("+91 98765 43210", "Hello patient");

    expect(result).toEqual({ status: "SENT", providerMessageId: "wamid.TEST123" });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v21.0/123456/messages");
    expect(options.headers.Authorization).toBe("Bearer test-token");
    const body = JSON.parse(options.body);
    expect(body.to).toBe("919876543210"); // digits only, no '+' or spaces
    expect(body.type).toBe("text");
    expect(body.text.body).toBe("Hello patient");
  });

  it("returns FAILED with Meta's own error message on a non-2xx response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Invalid OAuth access token" } }),
    }) as unknown as typeof fetch;

    const provider = new MetaWhatsAppProvider("bad-token", "123456");
    const result = await provider.sendMessage("+919876543210", "Hi");

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("Invalid OAuth access token");
  });

  it("returns FAILED when the API accepts the request but returns no message id", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const provider = new MetaWhatsAppProvider("test-token", "123456");
    const result = await provider.sendMessage("+919876543210", "Hi");

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toMatch(/no message id/i);
  });

  it("returns FAILED instead of throwing when the network request itself fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("fetch failed: ECONNREFUSED")) as unknown as typeof fetch;

    const provider = new MetaWhatsAppProvider("test-token", "123456");
    const result = await provider.sendMessage("+919876543210", "Hi");

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("ECONNREFUSED");
  });
});
