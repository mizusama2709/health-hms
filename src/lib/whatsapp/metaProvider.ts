import { WhatsAppProvider, WhatsAppSendResult } from "./provider";
import { logError } from "@/lib/logger";

const GRAPH_API_VERSION = "v21.0";

// Meta requires digits-only, country code included, no leading '+' or
// separators — this app stores phone numbers in a human-entered format
// (e.g. "+91 98765 43210"), so every send needs this normalization.
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

// Real WhatsApp Cloud API integration — swaps in for MockWhatsAppProvider
// via WHATSAPP_PROVIDER=meta (see getWhatsAppProvider in lib/whatsapp.ts).
//
// Known limitation, not a bug: this sends free-text messages, which Meta
// only accepts within an active 24-hour customer-service window (i.e. the
// patient messaged in recently). Every send in this app today —
// invoice/prescription/consultation-summary/lab-report/follow-up-reminder —
// is staff- or system-initiated, almost always *outside* that window, which
// means Meta will reject it unless the message is sent as a pre-approved
// template instead. Getting templates approved is a manual step in Meta's
// Business Manager (submit each of the ~5 message shapes this app sends,
// wait for approval — days, not code) that has to happen before this
// provider can carry real traffic; wiring template support in is the very
// next piece of this integration once template names/ids exist to
// reference. Until then, this provider is correct and ready for the
// within-window case (e.g. replying to an inbound WhatsApp message) and
// safe to deploy — a rejected send fails loudly (FAILED status, visible to
// staff) rather than silently.
export class MetaWhatsAppProvider implements WhatsAppProvider {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;

  constructor(accessToken: string, phoneNumberId: string) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
  }

  async sendMessage(toPhone: string, body: string): Promise<WhatsAppSendResult> {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${this.phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizePhone(toPhone),
          type: "text",
          text: { body },
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message = payload?.error?.message ?? `WhatsApp API returned HTTP ${response.status}`;
        logError("whatsapp-meta-send", new Error(message), { httpStatus: response.status });
        return { status: "FAILED", errorMessage: message };
      }

      const providerMessageId = payload?.messages?.[0]?.id;
      if (!providerMessageId) {
        return { status: "FAILED", errorMessage: "WhatsApp API accepted the request but returned no message id" };
      }

      return { status: "SENT", providerMessageId };
    } catch (err) {
      logError("whatsapp-meta-send", err, { stage: "fetch" });
      return { status: "FAILED", errorMessage: err instanceof Error ? err.message : "Unknown WhatsApp send error" };
    }
  }
}
