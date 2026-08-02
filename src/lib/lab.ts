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
  defaultPrice: number;
  turnaroundTime?: string;
}) {
  return db.labTestCatalog.create({
    data: {
      tenantId: params.tenantId,
      name: params.name,
      code: params.code,
      defaultPrice: params.defaultPrice,
      turnaroundTime: params.turnaroundTime,
    },
  });
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

export async function recordLabResult(
  tenantId: string,
  labOrderItemId: string,
  params: { resultValue?: string; resultUnit?: string; referenceRange?: string; flag?: LabResultFlag }
) {
  return db.labOrderItem.updateMany({
    where: { id: labOrderItemId, labOrder: { tenantId } },
    data: params,
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
