import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-5";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  if (!isAiConfigured()) {
    throw new Error(
      "AI features require ANTHROPIC_API_KEY to be set in .env. Add your Anthropic API key and restart the dev server."
    );
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function complete(system: string, userMessage: string): Promise<string> {
  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}

export type ConsultSummaryInput = {
  patientName: string;
  specialty: string;
  pastVisits: { date: string; notes: string; diagnosis?: string }[];
  labResults: { testName: string; value?: string; unit?: string; flag?: string }[];
  activePrescriptions: { medicine: string; quantity: number; dosage?: string }[];
  knowledgeBaseTitles: string[];
};

export async function generateConsultSummary(input: ConsultSummaryInput): Promise<string> {
  const system = `You are a clinical documentation assistant for a ${input.specialty} practice. Summarize the patient's history into a concise pre-consultation brief for the doctor: key past visits, notable diagnoses, out-of-range lab results, and active medications. Flag anything that needs the doctor's attention. Be factual and concise — do not invent information not present in the provided data. This is a decision-support aid, not a diagnosis.`;

  const userMessage = `Patient: ${input.patientName}

Past visits:
${input.pastVisits.map((v) => `- ${v.date}: ${v.notes}${v.diagnosis ? ` (diagnosis: ${v.diagnosis})` : ""}`).join("\n") || "None recorded."}

Lab results:
${input.labResults.map((l) => `- ${l.testName}: ${l.value ?? "pending"} ${l.unit ?? ""} ${l.flag ? `[${l.flag}]` : ""}`).join("\n") || "None recorded."}

Active prescriptions:
${input.activePrescriptions.map((p) => `- ${p.medicine} x${p.quantity}${p.dosage ? ` (${p.dosage})` : ""}`).join("\n") || "None recorded."}

Available knowledge base references: ${input.knowledgeBaseTitles.join(", ") || "none"}`;

  return complete(system, userMessage);
}

export type InziScope = "STAFF" | "DOCTOR";

export async function answerClinicalQuery(question: string, scope: InziScope, history: string): Promise<string> {
  const system =
    scope === "DOCTOR"
      ? "You are InZi, a clinical assistant embedded in a hospital management system. Answer the doctor's clinical or operational questions concisely and factually. If a question requires patient-specific data you don't have, say so rather than guessing. This is decision support, not a substitute for clinical judgment."
      : "You are InZi, an assistant embedded in a hospital management system, helping front-desk and administrative staff with onboarding and day-to-day operational questions about using the system. Be concise and practical.";

  const userMessage = history ? `${history}\n\nUser: ${question}` : `User: ${question}`;
  return complete(system, userMessage);
}
