import { db } from "@/lib/db";
import type { WhatsAppDirection, WhatsAppMessageStatus } from "@prisma/client";

export async function listWhatsAppMessages(
  tenantId: string,
  filters?: { direction?: WhatsAppDirection; status?: WhatsAppMessageStatus; from?: Date; to?: Date }
) {
  return db.whatsAppMessage.findMany({
    where: {
      tenantId,
      ...(filters?.direction && { direction: filters.direction }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.from || filters?.to
        ? { createdAt: { gte: filters?.from, lte: filters?.to } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWhatsAppMessage(id: string, tenantId: string) {
  return db.whatsAppMessage.findFirst({ where: { id, tenantId } });
}

function messagePhone(m: { direction: WhatsAppDirection; fromPhone: string | null; toPhone: string | null }) {
  return (m.direction === "INBOUND" ? m.fromPhone : m.toPhone) ?? "unknown";
}

export async function listConversations(tenantId: string, search?: string) {
  const [messages, patients] = await Promise.all([
    db.whatsAppMessage.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    db.patient.findMany({ where: { tenantId, user: { phone: { not: null } } }, include: { user: true } }),
  ]);

  const patientByPhone = new Map(patients.map((p) => [p.user.phone as string, p]));

  const byPhone = new Map<string, { phone: string; messages: typeof messages }>();
  for (const m of messages) {
    const phone = messagePhone(m);
    if (!byPhone.has(phone)) byPhone.set(phone, { phone, messages: [] });
    byPhone.get(phone)!.messages.push(m);
  }

  let conversations = [...byPhone.values()].map((c) => {
    const last = c.messages[0];
    const patient = patientByPhone.get(c.phone);
    return {
      phone: c.phone,
      patientName: patient?.user.name ?? null,
      patientId: patient?.id ?? null,
      lastMessage: last,
      messageCount: c.messages.length,
      hasFailed: c.messages.some((m) => m.status === "FAILED"),
    };
  });

  conversations.sort((a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime());

  if (search) {
    const q = search.toLowerCase();
    conversations = conversations.filter(
      (c) => c.phone.toLowerCase().includes(q) || c.patientName?.toLowerCase().includes(q)
    );
  }

  return conversations;
}

export async function getConversationThread(tenantId: string, phone: string) {
  const [messages, patient] = await Promise.all([
    db.whatsAppMessage.findMany({
      where: { tenantId, OR: [{ fromPhone: phone }, { toPhone: phone }] },
      orderBy: { createdAt: "asc" },
    }),
    db.patient.findFirst({ where: { tenantId, user: { phone } }, include: { user: true } }),
  ]);

  return { messages, patient };
}
