import { describe, it, expect, afterEach, vi } from "vitest";
import { getWhatsAppProvider } from "@/lib/whatsapp";
import { MockWhatsAppProvider } from "@/lib/whatsapp/mockProvider";
import { MetaWhatsAppProvider } from "@/lib/whatsapp/metaProvider";

// Regression coverage for the safe-by-default provider selection: a real
// send must never happen by accident. WHATSAPP_PROVIDER has to be
// explicitly "meta" AND both credentials present, or this falls back to
// the mock — including the half-configured case (provider=meta but a
// missing token), which is the one most likely to happen from a copy-paste
// mistake in a real .env file.

const ORIGINAL = {
  WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
};

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("getWhatsAppProvider", () => {
  it("defaults to the mock provider when WHATSAPP_PROVIDER is unset", () => {
    delete process.env.WHATSAPP_PROVIDER;
    expect(getWhatsAppProvider()).toBeInstanceOf(MockWhatsAppProvider);
  });

  it("selects the real Meta provider when fully configured", () => {
    process.env.WHATSAPP_PROVIDER = "meta";
    process.env.WHATSAPP_ACCESS_TOKEN = "token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
    expect(getWhatsAppProvider()).toBeInstanceOf(MetaWhatsAppProvider);
  });

  it("falls back to mock when WHATSAPP_PROVIDER=meta but the access token is missing", () => {
    process.env.WHATSAPP_PROVIDER = "meta";
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getWhatsAppProvider()).toBeInstanceOf(MockWhatsAppProvider);
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });

  it("falls back to mock when WHATSAPP_PROVIDER=meta but the phone number id is missing", () => {
    process.env.WHATSAPP_PROVIDER = "meta";
    process.env.WHATSAPP_ACCESS_TOKEN = "token";
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getWhatsAppProvider()).toBeInstanceOf(MockWhatsAppProvider);

    warn.mockRestore();
  });

  it("uses mock for any value other than exactly 'meta'", () => {
    process.env.WHATSAPP_PROVIDER = "twilio";
    process.env.WHATSAPP_ACCESS_TOKEN = "token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
    expect(getWhatsAppProvider()).toBeInstanceOf(MockWhatsAppProvider);
  });
});
