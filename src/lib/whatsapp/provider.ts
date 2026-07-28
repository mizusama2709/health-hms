export interface WhatsAppSendResult {
  status: "SENT" | "SIMULATED" | "FAILED";
  providerMessageId?: string;
  errorMessage?: string;
}

export interface WhatsAppProvider {
  sendMessage(toPhone: string, body: string): Promise<WhatsAppSendResult>;
}
