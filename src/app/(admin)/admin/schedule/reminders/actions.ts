"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { scheduleReminder, logFollowUpCall, cancelFollowUp } from "@/lib/followUps";
import { withActionResult } from "@/lib/actionResult";
import type { FollowUpNextAction, FollowUpOutcome } from "@prisma/client";

const FOLLOWUP_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN", "RECEPTIONIST", "NURSE"] as const;

export async function scheduleReminderAction(formData: FormData) {
  await requireRole(...FOLLOWUP_ROLES);
  const tenantId = await requireTenantId();

  const followUpId = formData.get("followUpId") as string;
  const reminderAt = new Date(formData.get("reminderAt") as string);
  const reminderMessage = formData.get("reminderMessage") as string;

  await scheduleReminder({ tenantId, followUpId, reminderAt, reminderMessage });

  revalidatePath("/admin/schedule/reminders");
}

export const scheduleReminderActionResult = withActionResult(scheduleReminderAction, "Reminder scheduled");

async function logFollowUpCallAction(formData: FormData) {
  const session = await requireRole(...FOLLOWUP_ROLES);
  const tenantId = await requireTenantId();

  const followUpId = formData.get("followUpId") as string;
  const outcome = formData.get("outcome") as FollowUpOutcome;
  const notes = formData.get("notes") as string;
  const nextAction = formData.get("nextAction") as FollowUpNextAction;
  const nextFollowUpAtRaw = formData.get("nextFollowUpAt") as string;

  if (!notes) throw new Error("Add a note about how the call went");
  if (nextAction === "ANOTHER_CALL_SCHEDULED" && !nextFollowUpAtRaw) {
    throw new Error("Choose a date for the next call");
  }

  await logFollowUpCall({
    tenantId,
    followUpId,
    calledById: session.user.id,
    outcome,
    notes,
    nextAction,
    nextFollowUpAt: nextFollowUpAtRaw ? new Date(nextFollowUpAtRaw) : undefined,
  });

  revalidatePath("/admin/schedule/reminders");
}

async function cancelFollowUpAction(formData: FormData) {
  await requireRole(...FOLLOWUP_ROLES);
  const tenantId = await requireTenantId();

  const followUpId = formData.get("followUpId") as string;
  await cancelFollowUp(tenantId, followUpId);

  revalidatePath("/admin/schedule/reminders");
}

export const logFollowUpCallActionResult = withActionResult(logFollowUpCallAction, "Call logged");
export const cancelFollowUpActionResult = withActionResult(cancelFollowUpAction, "Follow-up cancelled");
