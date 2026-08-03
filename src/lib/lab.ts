import { db } from "@/lib/db";
import { recordJourneyEvent } from "@/lib/journey";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { LabOrderStatus, LabResultFlag } from "@prisma/client";

export async function listLabTests(tenantId: string, filters?: { isActive?: boolean }) {
  return db.labTestCatalog.findMany({
    where: { tenantId, ...(filters?.isActive !== undefined && { isActive: filters.isActive }) },
    orderBy: { name: "asc" },
  });
}

export async function createLabTest(params: {
  tenantId: string;
  name: string;
  code?: string;
  sampleType?: string;
  defaultPrice: number;
  gstPercent?: number;
  turnaroundTime?: string;
}) {
  return db.labTestCatalog.create({
    data: {
      tenantId: params.tenantId,
      name: params.name,
      code: params.code,
      sampleType: params.sampleType,
      defaultPrice: params.defaultPrice,
      gstPercent: params.gstPercent ?? 0,
      turnaroundTime: params.turnaroundTime,
    },
  });
}

// A real hard delete, not a soft-delete via isActive — but a test that's
// already been ordered has LabOrderItem rows pointing at it (real patient
// results/reports), so silently cascading that away would destroy medical
// history. Give a clear reason instead of letting the raw FK error surface.
export async function deleteLabTest(tenantId: string, labTestId: string) {
  const test = await db.labTestCatalog.findFirstOrThrow({ where: { id: labTestId, tenantId } });
  const orderCount = await db.labOrderItem.count({ where: { labTestId: test.id } });
  if (orderCount > 0) {
    throw new Error(`"${test.name}" has already been ordered ${orderCount} time(s) and can't be deleted`);
  }
  await db.labTestParameter.deleteMany({ where: { labTestId: test.id } });
  await db.labTestCatalog.delete({ where: { id: test.id } });
}

export async function getLabTest(tenantId: string, labTestId: string) {
  return db.labTestCatalog.findFirst({
    where: { id: labTestId, tenantId },
    include: { parameters: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function createLabTestParameter(params: {
  tenantId: string;
  labTestId: string;
  name: string;
  unit?: string;
  referenceLow?: number;
  referenceHigh?: number;
  referenceText?: string;
}) {
  const test = await db.labTestCatalog.findFirstOrThrow({ where: { id: params.labTestId, tenantId: params.tenantId } });
  const maxSort = await db.labTestParameter.aggregate({ where: { labTestId: test.id }, _max: { sortOrder: true } });
  return db.labTestParameter.create({
    data: {
      labTestId: test.id,
      name: params.name,
      unit: params.unit,
      referenceLow: params.referenceLow,
      referenceHigh: params.referenceHigh,
      referenceText: params.referenceText,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });
}

export async function deleteLabTestParameter(tenantId: string, parameterId: string) {
  await db.labTestParameter.findFirstOrThrow({
    where: { id: parameterId, labTest: { tenantId } },
  });
  await db.labTestParameter.delete({ where: { id: parameterId } });
}

export async function createLabOrder(params: {
  tenantId: string;
  patientId: string;
  appointmentId?: string;
  orderedById: string;
  testIds: string[];
  patientConsentedAt: Date;
}) {
  const order = await db.labOrder.create({
    data: {
      tenantId: params.tenantId,
      patientId: params.patientId,
      appointmentId: params.appointmentId,
      orderedById: params.orderedById,
      patientConsentedAt: params.patientConsentedAt,
      items: { create: params.testIds.map((labTestId) => ({ labTestId })) },
    },
    include: { items: true },
  });

  if (params.appointmentId) {
    await recordJourneyEvent({
      tenantId: params.tenantId,
      appointmentId: params.appointmentId,
      patientId: params.patientId,
      step: "LAB_ORDERED",
      recordedById: params.orderedById,
    });
  }

  return order;
}

// Any lab test ordered during a given appointment is expected back by the
// time of a follow-up prescribed at that same visit — called from
// completeVisitAction right after the FollowUp is created.
export async function linkLabOrdersToFollowUp(tenantId: string, appointmentId: string, followUpId: string) {
  return db.labOrder.updateMany({
    where: { tenantId, appointmentId, followUpId: null },
    data: { followUpId },
  });
}

export async function updateLabOrderStatus(tenantId: string, labOrderId: string, status: LabOrderStatus, recordedById?: string) {
  const order = await db.labOrder.findFirst({ where: { id: labOrderId, tenantId } });
  if (!order) throw new Error("Lab order not found");

  await db.labOrder.update({ where: { id: labOrderId }, data: { status } });

  if (status === "COMPLETED" && order.appointmentId) {
    await recordJourneyEvent({
      tenantId,
      appointmentId: order.appointmentId,
      patientId: order.patientId,
      step: "LAB_COMPLETED",
      recordedById,
    });
  }

  return order;
}

function formatParameterRange(param: {
  unit: string | null;
  referenceLow: unknown;
  referenceHigh: unknown;
  referenceText: string | null;
}): string {
  if (param.referenceText) return param.referenceText;
  const unit = param.unit ? ` ${param.unit}` : "";
  if (param.referenceLow !== null && param.referenceHigh !== null) return `${param.referenceLow}–${param.referenceHigh}${unit}`;
  if (param.referenceLow !== null) return `≥ ${param.referenceLow}${unit}`;
  if (param.referenceHigh !== null) return `≤ ${param.referenceHigh}${unit}`;
  return "";
}

// Only NORMAL/ABNORMAL are ever inferred — a real CRITICAL/panic-value call
// needs test-specific alert thresholds this reference data doesn't carry
// (e.g. potassium's critical cutoffs differ from its normal-range cutoffs),
// so guessing one would be a patient-safety risk. CRITICAL stays a flag
// staff assign deliberately, never something this function fabricates.
function computeAutoFlag(
  resultValue: string,
  param: { unit: string | null; referenceLow: unknown; referenceHigh: unknown; referenceText: string | null }
): LabResultFlag | undefined {
  const trimmed = resultValue.trim();
  if (!trimmed) return undefined;

  if (param.referenceLow !== null || param.referenceHigh !== null) {
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return undefined; // e.g. "<5", "1:160" — not safe to auto-parse
    const low = param.referenceLow !== null ? Number(param.referenceLow) : -Infinity;
    const high = param.referenceHigh !== null ? Number(param.referenceHigh) : Infinity;
    return numeric >= low && numeric <= high ? "NORMAL" : "ABNORMAL";
  }

  // Qualitative single-word expected values only (e.g. "Negative",
  // "Non-reactive") — free-text interpretive ranges ("Age- and sex-specific
  // (use banded chart)") are never matched, since there's no fixed value to
  // compare against.
  const text = param.referenceText?.trim();
  if (text && /^(negative|non-reactive|absent|clear)\b/i.test(text)) {
    const expected = text.split(/[\s(]/)[0].toLowerCase();
    const actual = trimmed.toLowerCase();
    return actual === expected || actual.startsWith(expected) ? "NORMAL" : "ABNORMAL";
  }

  return undefined;
}

export async function recordLabResult(
  tenantId: string,
  labOrderItemId: string,
  params: { resultValue?: string; resultUnit?: string; referenceRange?: string; flag?: LabResultFlag }
) {
  const item = await db.labOrderItem.findFirstOrThrow({
    where: { id: labOrderItemId, labOrder: { tenantId } },
    include: { labTest: { include: { parameters: true } } },
  });

  // Auto-flagging only makes sense when the test has exactly one parameter —
  // a single resultValue can't be matched against several analytes' ranges
  // (e.g. a CBC panel), so those tests keep the existing manual flag/range
  // entry untouched.
  const singleParam = item.labTest.parameters.length === 1 ? item.labTest.parameters[0] : undefined;

  let referenceRange = params.referenceRange;
  let flag = params.flag;
  let flagIsManual = item.flagIsManual;

  if (singleParam) {
    if (!referenceRange) referenceRange = formatParameterRange(singleParam) || undefined;

    if (params.flag === undefined) {
      // The "—" option was submitted — an explicit reset back to auto mode.
      flagIsManual = false;
    } else if (item.flagIsManual || params.flag !== item.flag) {
      // Either already manual, or this differs from what's currently
      // stored — a deliberate choice, not the previous auto value just
      // round-tripping back through the form unchanged.
      flagIsManual = true;
    }
    // else: the submitted flag matches the currently-stored (auto) value
    // and we're still in auto mode — not a deliberate choice, so it stays
    // auto and gets recomputed fresh below rather than frozen in place.

    flag = flagIsManual ? params.flag : params.resultValue ? computeAutoFlag(params.resultValue, singleParam) : undefined;
  } else {
    flagIsManual = params.flag !== undefined;
  }

  return db.labOrderItem.updateMany({
    where: { id: labOrderItemId, labOrder: { tenantId } },
    data: { resultValue: params.resultValue, resultUnit: params.resultUnit, referenceRange, flag, flagIsManual },
  });
}

export async function approveLabOrder(tenantId: string, labOrderId: string, approvedById: string) {
  const order = await db.labOrder.findFirst({ where: { id: labOrderId, tenantId } });
  if (!order) throw new Error("Lab order not found");
  if (order.status !== "COMPLETED") throw new Error("Results must be complete before an order can be approved");

  return db.labOrder.update({
    where: { id: labOrderId },
    data: { approvedById, approvedAt: new Date() },
  });
}

type LabOrderForReport = Awaited<ReturnType<typeof loadLabOrderForReport>>;

async function loadLabOrderForReport(tenantId: string, labOrderId: string) {
  return db.labOrder.findFirst({
    where: { id: labOrderId, tenantId },
    include: {
      patient: { include: { user: true } },
      items: { include: { labTest: true } },
    },
  });
}

// Renders the order's already-entered structured results (value/unit/range/
// flag) as a simple tabular PDF — no PDF-parsing is needed anywhere in this
// app because the visualization on the patient's chart reads that same
// structured data directly, not this rendered document.
export async function generateLabReportPdf(order: NonNullable<LabOrderForReport>): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 50;
  const draw = (text: string, opts: { size?: number; f?: typeof font; color?: ReturnType<typeof rgb> } = {}) => {
    page.drawText(text, { x: left, y, size: opts.size ?? 11, font: opts.f ?? font, color: opts.color ?? rgb(0, 0, 0) });
    y -= (opts.size ?? 11) + 8;
  };

  draw("Lab Report", { size: 20, f: bold });
  y -= 6;
  draw(`Patient: ${order.patient.user.name}`, { f: bold });
  draw(`Ordered: ${order.orderedAt.toLocaleDateString()}`);
  if (order.approvedAt) draw(`Approved: ${order.approvedAt.toLocaleDateString()}`);
  y -= 10;

  draw("Test", { f: bold });
  for (const item of order.items) {
    const flagLabel = item.flag ? ` [${item.flag}]` : "";
    const color = item.flag === "CRITICAL" ? rgb(0.7, 0.1, 0.1) : item.flag === "ABNORMAL" ? rgb(0.75, 0.45, 0) : rgb(0, 0, 0);
    draw(
      `${item.labTest.name}: ${item.resultValue ?? "—"} ${item.resultUnit ?? ""}  (ref: ${item.referenceRange ?? "n/a"})${flagLabel}`,
      { color }
    );
  }

  return doc.save();
}

// Generates the PDF from the order's own data, stores it, and points fileUrl
// at the internal route that serves it back — no manual URL entry anymore.
export async function generateAndAttachLabReport(
  tenantId: string,
  labOrderId: string,
  uploadedById: string,
  baseUrl: string
) {
  const order = await loadLabOrderForReport(tenantId, labOrderId);
  if (!order) throw new Error("Lab order not found");
  if (!order.approvedAt) throw new Error("This lab order must be approved before its report can be generated");

  const pdfBytes = await generateLabReportPdf(order);

  const report = await db.labReport.create({
    data: { labOrderId, fileUrl: "", pdfData: Buffer.from(pdfBytes), uploadedById },
  });

  return db.labReport.update({
    where: { id: report.id },
    data: { fileUrl: `${baseUrl}/api/lab-reports/${report.id}/pdf` },
  });
}

export async function listLabOrders(tenantId: string, filters?: { status?: LabOrderStatus; patientId?: string }) {
  return db.labOrder.findMany({
    where: {
      tenantId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.patientId && { patientId: filters.patientId }),
    },
    include: {
      patient: { include: { user: true } },
      items: { include: { labTest: true } },
      reports: true,
    },
    orderBy: { orderedAt: "desc" },
  });
}

// Most recent COMPLETED lab order per patient, for a compact inline summary
// (e.g. on the doctor's dashboard ahead of a follow-up visit) without an
// N+1 query per appointment row.
export async function listLatestCompletedLabOrdersForPatients(tenantId: string, patientIds: string[]) {
  const orders = await db.labOrder.findMany({
    where: { tenantId, patientId: { in: patientIds }, status: "COMPLETED" },
    include: { items: { include: { labTest: true } } },
    orderBy: { orderedAt: "desc" },
  });

  const byPatient = new Map<string, (typeof orders)[number]>();
  for (const order of orders) {
    if (!byPatient.has(order.patientId)) byPatient.set(order.patientId, order);
  }
  return byPatient;
}

// Latest WhatsApp send attempt per report, so staff can see at a glance
// whether the automatic send at approval actually reached the patient
// (SENT/SIMULATED) or failed (e.g. no phone on file) without digging into
// WhatsApp message logs.
export async function listLatestWhatsAppStatusForLabReports(tenantId: string, labReportIds: string[]) {
  const messages = await db.whatsAppMessage.findMany({
    where: { tenantId, relatedLabReportId: { in: labReportIds } },
    orderBy: { createdAt: "desc" },
    select: { relatedLabReportId: true, status: true, errorMessage: true, createdAt: true },
  });

  const byReportId = new Map<string, (typeof messages)[number]>();
  for (const message of messages) {
    if (message.relatedLabReportId && !byReportId.has(message.relatedLabReportId)) {
      byReportId.set(message.relatedLabReportId, message);
    }
  }
  return byReportId;
}

export async function listAppointmentIdsWithUnlinkedLabOrders(tenantId: string, appointmentIds: string[]) {
  const orders = await db.labOrder.findMany({
    where: { tenantId, appointmentId: { in: appointmentIds }, followUpId: null },
    select: { appointmentId: true },
  });
  return new Set(orders.map((o) => o.appointmentId).filter((id): id is string => id !== null));
}

export async function listLabReportTemplates(tenantId: string) {
  return db.labReportTemplate.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export async function createLabReportTemplate(params: { tenantId: string; name: string; body: string }) {
  return db.labReportTemplate.create({ data: params });
}

export async function updateLabReportTemplate(tenantId: string, templateId: string, params: { name?: string; body?: string }) {
  return db.labReportTemplate.updateMany({ where: { id: templateId, tenantId }, data: params });
}
