import { WhatsAppProvider, WhatsAppSendResult } from "./provider";

export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendMessage(toPhone: string, body: string): Promise<WhatsAppSendResult> {
    console.log(`[mock WhatsApp] -> ${toPhone}: ${body}`);
    return {
      status: "SIMULATED",
      providerMessageId: `mock-${Date.now()}`,
    };
  }
}
