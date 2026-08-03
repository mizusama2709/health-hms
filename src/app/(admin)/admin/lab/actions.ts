"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { db } from "@/lib/db";
import {
  createLabTest,
  deleteLabTest,
  createLabTestParameter,
  deleteLabTestParameter,
  createLabOrder,
  updateLabOrderStatus,
  approveLabOrder,
  recordLabResult,
  generateAndAttachLabReport,
  createLabReportTemplate,
} from "@/lib/lab";
import { sendLabReportViaWhatsApp } from "@/lib/whatsapp";
import { searchPatients } from "@/lib/patients";
import { withActionResult } from "@/lib/actionResult";
import type { LabOrderStatus, LabResultFlag } from "@prisma/client";

const LAB_ROLES = ["LAB", "ADMIN_RECEPTION", "SUPER_ADMIN"] as const;

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function createLabTestAction(formData: FormData) {
  await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const code = (formData.get("code") as string) || undefined;
  const sampleType = (formData.get("sampleType") as string) || undefined;
  const defaultPrice = Number(formData.get("defaultPrice"));
  const gstPercent = formData.get("gstPercent") ? Number(formData.get("gstPercent")) : undefined;
  const turnaroundTime = (formData.get("turnaroundTime") as string) || undefined;

  await createLabTest({ tenantId, name, code, sampleType, defaultPrice, gstPercent, turnaroundTime });

  revalidatePath("/admin/lab/tests");
}

export async function deleteLabTestAction(formData: FormData) {
  await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();
  const labTestId = formData.get("labTestId") as string;

  await deleteLabTest(tenantId, labTestId);

  revalidatePath("/admin/lab/tests");
}

export const deleteLabTestActionResult = withActionResult(deleteLabTestAction, "Test deleted");

export async function createLabTestParameterAction(formData: FormData) {
  await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();

  const labTestId = formData.get("labTestId") as string;
  const name = formData.get("name") as string;
  const unit = (formData.get("unit") as string) || undefined;
  const referenceLow = formData.get("referenceLow") ? Number(formData.get("referenceLow")) : undefined;
  const referenceHigh = formData.get("referenceHigh") ? Number(formData.get("referenceHigh")) : undefined;
  const referenceText = (formData.get("referenceText") as string) || undefined;

  await createLabTestParameter({ tenantId, labTestId, name, unit, referenceLow, referenceHigh, referenceText });

  revalidatePath(`/admin/lab/tests/${labTestId}/parameters`);
}

export const createLabTestParameterActionResult = withActionResult(createLabTestParameterAction, "Parameter added");

export async function deleteLabTestParameterAction(formData: FormData) {
  await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();
  const parameterId = formData.get("parameterId") as string;
  const labTestId = formData.get("labTestId") as string;

  await deleteLabTestParameter(tenantId, parameterId);

  revalidatePath(`/admin/lab/tests/${labTestId}/parameters`);
}

export const deleteLabTestParameterActionResult = withActionResult(deleteLabTestParameterAction, "Parameter removed");

export async function searchPatientsAction(query: string) {
  await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();
  return searchPatients(tenantId, query);
}

export async function createLabOrderAction(formData: FormData) {
  const session = await requireRole(...LAB_ROLES);
  const tenantId = await requireTenantId();

  const patientId = formData.get("patientId") as string;
  const testId = formData.get("testId") as string;
  const patientConsented = formData.get("patientConsented") === "true";

  const patient = await db.patient.findFirst({ where: { id: patientId, tenantId } });
  if (!patient) throw new Error("Select a patient before ordering a test");
  if (!patientConsented) throw new Error("Patient consent is required before ordering a lab test");

  await createLabOrder({
    tenantId,
    patientId: patient.id,
    orderedById: session.user.id,
    testIds: [testId],
    patientConsentedAt: new Date(),
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

  // Generate the PDF from the results already entered and send it — no
  // manual "attach a report" step anymore.
  const baseUrl = await getBaseUrl();
  const report = await generateAndAttachLabReport(tenantId, labOrderId, session.user.id, baseUrl);

  const order = await db.labOrder.findFirst({
    where: { id: labOrderId, tenantId },
    include: { patient: { include: { user: true } } },
  });
  if (order?.patient.user.phone) {
    await sendLabReportViaWhatsApp({ tenantId, labReportId: report.id, toPhone: order.patient.user.phone });
  }

  revalidatePath("/admin/lab/orders");
  revalidatePath("/admin/lab/reports/upload");
  if (order) revalidatePath(`/admin/patients/${order.patientId}`);
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
