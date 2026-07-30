"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { db } from "@/lib/db";
import {
  createLabTest,
  createLabOrder,
  updateLabOrderStatus,
  approveLabOrder,
  recordLabResult,
  attachLabReport,
  createLabReportTemplate,
} from "@/lib/lab";
import { sendLabReportViaWhatsApp } from "@/lib/whatsapp";
import type { LabOrderStatus, LabResultFlag } from "@prisma/client";

const LAB_ROLES = ["LAB", "ADMIN_RECEPTION", "SUPER_ADMIN"] as const;

export async function createLabTestAction(formData: FormData) {
  await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const code = (formData.get("code") as string) || undefined;
  const defaultPrice = Number(formData.get("defaultPrice"));
  const turnaroundTime = (formData.get("turnaroundTime") as string) || undefined;

  await createLabTest({ tenantId, name, code, defaultPrice, turnaroundTime });

  revalidatePath("/admin/lab/tests");
}

export async function createLabOrderAction(formData: FormData) {
  const session = await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();

  const patientEmail = formData.get("patientEmail") as string;
  const testId = formData.get("testId") as string;

  const patient = await db.patient.findFirst({ where: { tenantId, user: { email: patientEmail } } });
  if (!patient) throw new Error(`No patient found in this hospital with email ${patientEmail}`);

  await createLabOrder({
    tenantId,
    patientId: patient.id,
    orderedById: session.user.id,
    testIds: [testId],
  });

  revalidatePath("/admin/lab/orders");
}

export async function updateLabOrderStatusAction(formData: FormData) {
  const session = await auth();
  await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();

  const labOrderId = formData.get("labOrderId") as string;
  const status = formData.get("status") as LabOrderStatus;

  await updateLabOrderStatus(tenantId, labOrderId, status, session?.user?.id);

  revalidatePath("/admin/lab/orders");
}

export async function approveLabOrderAction(formData: FormData) {
  const session = await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();

  const labOrderId = formData.get("labOrderId") as string;

  await approveLabOrder(tenantId, labOrderId, session.user.id);

  revalidatePath("/admin/lab/orders");
}

export async function recordLabResultAction(formData: FormData) {
  await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();

  const labOrderItemId = formData.get("labOrderItemId") as string;
  const resultValue = (formData.get("resultValue") as string) || undefined;
  const resultUnit = (formData.get("resultUnit") as string) || undefined;
  const referenceRange = (formData.get("referenceRange") as string) || undefined;
  const flagRaw = formData.get("flag") as string;

  await recordLabResult(tenantId, labOrderItemId, {
    resultValue,
    resultUnit,
    referenceRange,
    flag: (flagRaw || undefined) as LabResultFlag | undefined,
  });

  revalidatePath("/admin/lab/orders");
}

export async function attachLabReportAction(formData: FormData) {
  const session = await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();

  const labOrderId = formData.get("labOrderId") as string;
  const fileUrl = formData.get("fileUrl") as string;

  await attachLabReport(tenantId, labOrderId, { fileUrl, uploadedById: session.user.id });

  revalidatePath("/admin/lab/reports/upload");
  revalidatePath("/admin/lab/orders");
}

export async function sendLabReportWhatsAppAction(formData: FormData) {
  await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();

  const labReportId = formData.get("labReportId") as string;
  const toPhone = formData.get("toPhone") as string;

  await sendLabReportViaWhatsApp({ tenantId, labReportId, toPhone });

  revalidatePath("/admin/lab/orders");
  revalidatePath("/admin/lab/reports/upload");
}

export async function createLabReportTemplateAction(formData: FormData) {
  await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const body = formData.get("body") as string;

  await createLabReportTemplate({ tenantId, name, body });

  revalidatePath("/admin/lab/templates");
}
