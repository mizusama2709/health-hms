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
