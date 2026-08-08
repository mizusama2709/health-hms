// Minimal OpenRouter client — the AI SDK's provider packages are overkill for
// one fire-and-forget chat completion call, so this is plain fetch.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function generateAIReply(params: {
  patientMessage: string;
  patientName?: string | null;
  upcomingAppointment?: string | null;
}): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null; // caller falls back to a canned response

  const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat";

  const systemPrompt = [
    "You are a WhatsApp assistant for a hospital's front desk.",
    "Answer questions about hours, services, and appointments briefly and warmly.",
    "You cannot book, cancel, or modify appointments yourself — if the patient wants to book, tell them to reply with the word 'book' and it will be handled automatically.",
    "Never give a diagnosis or specific medical advice; for symptoms, advise booking a visit.",
    params.patientName ? `The patient's name is ${params.patientName}.` : "This sender is not a recognized patient yet.",
    params.upcomingAppointment ? `They have an upcoming appointment: ${params.upcomingAppointment}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: params.patientMessage },
      ],
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    console.error("OpenRouter request failed", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}
