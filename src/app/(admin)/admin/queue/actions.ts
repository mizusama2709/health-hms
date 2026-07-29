"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { recordVitals } from "@/lib/vitals";

export async function recordVitalsAction(formData: FormData) {
  const session = await requireRole("ADMIN_RECEPTION", "SUPER_ADMIN", "NURSE", "RECEPTIONIST");
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
