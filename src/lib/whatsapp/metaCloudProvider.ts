import { WhatsAppProvider, WhatsAppSendResult } from "./provider";

// WhatsApp Cloud API (Meta, direct) — https://developers.facebook.com/docs/whatsapp/cloud-api
export class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(toPhone: string, body: string): Promise<WhatsAppSendResult> {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      return { status: "FAILED", errorMessage: "WhatsApp Cloud API credentials not configured" };
    }

    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone,
        type: "text",
        text: { body },
      }),
    });

    if (!res.ok) {
      return { status: "FAILED", errorMessage: `WhatsApp Cloud API error ${res.status}: ${await res.text()}` };
    }

    const data = await res.json();
    return { status: "SENT", providerMessageId: data.messages?.[0]?.id };
  }
}
