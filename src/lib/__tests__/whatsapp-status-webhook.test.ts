import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { handleStatusWebhook } from "@/lib/whatsapp";

// Regression coverage for the delivery-status webhook: Meta reports
// sent/delivered/read/failed against the providerMessageId returned at
// send time, and a FAILED status should surface to staff — a message that
// silently never arrived is worse than one that visibly bounced.

let tenantId: string;
const createdMessageIds: string[] = [];

beforeAll(async () => {
  const tenant = await db.tenant.findFirstOrThrow();
  tenantId = tenant.id;
});

afterEach(async () => {
  for (const id of createdMessageIds.splice(0)) {
    await db.whatsAppMessage.delete({ where: { id } }).catch(() => {});
  }
  await db.notification.deleteMany({ where: { tenantId, type: "WHATSAPP_DELIVERY_FAILED" } });
});

function metaStatusPayload(id: string, status: string) {
  return {
    entry: [{ changes: [{ value: { statuses: [{ id, status }] } }] }],
  };
}

async function makeSentMessage(providerMessageId: string) {
  const message = await db.whatsAppMessage.create({
    data: {
      tenantId,
      direction: "OUTBOUND",
      status: "SENT",
      toPhone: "+919812345678",
      rawPayload: {},
      providerMessageId,
    },
  });
  createdMessageIds.push(message.id);
  return message;
}

describe("handleStatusWebhook", () => {
  it("updates the message status to DELIVERED then READ as callbacks arrive", async () => {
    const message = await makeSentMessage("wamid.STATUS1");

    await handleStatusWebhook(metaStatusPayload("wamid.STATUS1", "delivered"));
    expect((await db.whatsAppMessage.findUniqueOrThrow({ where: { id: message.id } })).status).toBe("DELIVERED");

    await handleStatusWebhook(metaStatusPayload("wamid.STATUS1", "read"));
    expect((await db.whatsAppMessage.findUniqueOrThrow({ where: { id: message.id } })).status).toBe("READ");
  });

  it("marks a message FAILED and notifies the tenant", async () => {
    const message = await makeSentMessage("wamid.STATUS2");

    const applied = await handleStatusWebhook(metaStatusPayload("wamid.STATUS2", "failed"));

    expect(applied).toEqual([{ id: message.id, status: "FAILED" }]);
    expect((await db.whatsAppMessage.findUniqueOrThrow({ where: { id: message.id } })).status).toBe("FAILED");

    const notification = await db.notification.findFirst({
      where: { tenantId, type: "WHATSAPP_DELIVERY_FAILED" },
    });
    expect(notification).not.toBeNull();
  });

  it("ignores a status update for a providerMessageId it doesn't recognize", async () => {
    const applied = await handleStatusWebhook(metaStatusPayload("wamid.NEVER-SENT-BY-US", "delivered"));
    expect(applied).toEqual([]);
  });

  it("ignores a malformed payload instead of throwing", async () => {
    await expect(handleStatusWebhook({ garbage: true })).resolves.toEqual([]);
    await expect(handleStatusWebhook(null)).resolves.toEqual([]);
  });
});
