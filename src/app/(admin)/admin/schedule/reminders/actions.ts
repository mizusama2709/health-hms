"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { scheduleReminder, markFollowUpStatus } from "@/lib/followUps";

const REMINDER_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN", "RECEPTIONIST"] as const;

export async function scheduleReminderAction(formData: FormData) {
  await requireRole(...REMINDER_ROLES);
  const tenantId = await requireTenantId();

  const followUpId = formData.get("followUpId") as string;
  const reminderAt = new Date(formData.get("reminderAt") as string);
  const reminderMessage = formData.get("reminderMessage") as string;

  await scheduleReminder({ tenantId, followUpId, reminderAt, reminderMessage });

  revalidatePath("/admin/schedule/reminders");
}

export async function markFollowUpStatusAction(formData: FormData) {
  await requireRole(...REMINDER_ROLES);
  const tenantId = await requireTenantId();

  const followUpId = formData.get("followUpId") as string;
  const status = formData.get("status") as string;

  await markFollowUpStatus(tenantId, followUpId, status);

  revalidatePath("/admin/schedule/reminders");
}
