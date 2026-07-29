"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { startStage, completeStage, upsertStageConfig, QUEUE_STAGES } from "@/lib/queueStages";
import type { QueueStage } from "@prisma/client";

const QUEUE_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN", "NURSE", "RECEPTIONIST"] as const;

export async function startStageAction(formData: FormData) {
  const session = await requireRole(...QUEUE_ROLES);
  const tenantId = await requireTenantId();

  const appointmentId = formData.get("appointmentId") as string;
  const stage = formData.get("stage") as QueueStage;
  const assignedToId = (formData.get("assignedToId") as string) || session.user.id;

  await startStage({ tenantId, appointmentId, stage, assignedToId });

  revalidatePath("/admin/queue");
}

export async function completeStageAction(formData: FormData) {
  await requireRole(...QUEUE_ROLES);
  const tenantId = await requireTenantId();

  const entryId = formData.get("entryId") as string;
  await completeStage(tenantId, entryId);

  revalidatePath("/admin/queue");
}

export async function updateStageConfigAction(formData: FormData) {
  await requireRole(...QUEUE_ROLES);
  const tenantId = await requireTenantId();

  for (const stage of QUEUE_STAGES) {
    const value = formData.get(`turnaround_${stage}`);
    if (value) {
      await upsertStageConfig(tenantId, stage, Number(value));
    }
  }

  revalidatePath("/admin/queue");
  revalidatePath("/admin/queue/configure");
}
