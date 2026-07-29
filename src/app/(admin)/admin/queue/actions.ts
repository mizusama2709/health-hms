"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { recordVitals } from "@/lib/vitals";
import { startStage, completeStage, upsertStageConfig, QUEUE_STAGES } from "@/lib/queueStages";
import type { QueueStage } from "@prisma/client";

const QUEUE_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN", "NURSE", "RECEPTIONIST"] as const;

export async function recordVitalsAction(formData: FormData) {
  const session = await requireRole(...QUEUE_ROLES);
  const tenantId = await requireTenantId();

  const patientId = formData.get("patientId") as string;
  const appointmentId = formData.get("appointmentId") as string;
  const bp = (formData.get("bp") as string) || undefined;
  const glucose = formData.get("glucose") ? Number(formData.get("glucose")) : undefined;
  const weight = formData.get("weight") ? Number(formData.get("weight")) : undefined;
  const spo2 = formData.get("spo2") ? Number(formData.get("spo2")) : undefined;

  await recordVitals({
    tenantId,
    patientId,
    appointmentId,
    bp,
    glucose,
    weight,
    spo2,
    recordedById: session.user.id,
  });

  redirect("/admin/queue");
}

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
