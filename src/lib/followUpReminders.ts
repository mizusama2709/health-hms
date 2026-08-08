import { db } from "@/lib/db";
import { MockWhatsAppProvider } from "@/lib/whatsapp/mockProvider";
import type { WhatsAppProvider } from "@/lib/whatsapp/provider";
import { logAudit } from "@/lib/audit";

const provider: WhatsAppProvider = new MockWhatsAppProvider();

export type FollowUpReminderRunSummary = { checked: number; sent: number; failed: number };

// Dispatches whatever staff have already scheduled via the Reminders page
// (FollowUp.reminderScheduled/reminderAt/reminderMessage) — this job doesn't
// invent its own reminder policy, it's the missing "actually send it at the
// scheduled time" half of a flow whose composer UI already existed. Runs
// across every tenant in one pass (a cron job, not a per-request handler,
// so there's no single caller tenant to scope to); every write inside the
// loop is still tenant-scoped via the FollowUp row's own tenantId.
export async function runFollowUpReminders(now: Date = new Date()): Promise<FollowUpReminderRunSummary> {
  const due = await db.followUp.findMany({
    where: {
      status: "PENDING",
      reminderScheduled: true,
      reminderSentAt: null,
      reminderAt: { lte: now },
    },
    include: { appointment: { include: { patient: { include: { user: true } } } } },
  });

  let sent = 0;
  let failed = 0;

  for (const followUp of due) {
    const toPhone = followUp.appointment.patient.user.phone;
    const body = followUp.reminderMessage ?? "This is a reminder about your upcoming follow-up.";

    if (!toPhone) {
      failed++;
      await db.$transaction([
        db.whatsAppMessage.create({
          data: {
            tenantId: followUp.tenantId,
            direction: "OUTBOUND",
            status: "FAILED",
            rawPayload: { body },
            relatedFollowUpId: followUp.id,
            errorMessage: "Patient has no phone number on file",
          },
        }),
        // Terminal, not transient — retrying won't add a phone number, so
        // mark it handled rather than re-attempting forever.
        db.followUp.update({ where: { id: followUp.id }, data: { reminderSentAt: now } }),
      ]);
      await logAudit({
        tenantId: followUp.tenantId,
        action: "FOLLOWUP_REMINDER_FAILED",
        entityType: "FollowUp",
        entityId: followUp.id,
        meta: { reason: "no_phone" },
      });
      continue;
    }

    const result = await provider.sendMessage(toPhone, body);
    const messageStatus = result.status === "SENT" ? "SENT" : result.status === "SIMULATED" ? "SIMULATED" : "FAILED";

    if (messageStatus === "FAILED") {
      failed++;
      await db.whatsAppMessage.create({
        data: {
          tenantId: followUp.tenantId,
          direction: "OUTBOUND",
          status: "FAILED",
          toPhone,
          rawPayload: { body },
          relatedFollowUpId: followUp.id,
          errorMessage: result.errorMessage,
        },
      });
      // Transient (provider/network) — leave reminderSentAt null so the
      // next run retries it.
      continue;
    }

    sent++;
    await db.$transaction([
      db.whatsAppMessage.create({
        data: {
          tenantId: followUp.tenantId,
          direction: "OUTBOUND",
          status: messageStatus,
          toPhone,
          rawPayload: { body },
          relatedFollowUpId: followUp.id,
        },
      }),
      db.followUp.update({ where: { id: followUp.id }, data: { reminderSentAt: now } }),
    ]);
    await logAudit({
      tenantId: followUp.tenantId,
      action: "FOLLOWUP_REMINDER_SENT",
      entityType: "FollowUp",
      entityId: followUp.id,
      meta: { status: messageStatus },
    });
  }

  return { checked: due.length, sent, failed };
}
