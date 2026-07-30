import { db } from "@/lib/db";
import { recordJourneyEvent } from "@/lib/journey";
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
}) {
  const order = await db.labOrder.create({
    data: {
      tenantId: params.tenantId,
      patientId: params.patientId,
      appointmentId: params.appointmentId,
      orderedById: params.orderedById,
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

export async function attachLabReport(tenantId: string, labOrderId: string, params: { fileUrl: string; uploadedById: string }) {
  const order = await db.labOrder.findFirst({ where: { id: labOrderId, tenantId } });
  if (!order) throw new Error("Lab order not found");
  if (!order.approvedAt) throw new Error("This lab order must be approved before its report can be sent");

  return db.labReport.create({
    data: { labOrderId, fileUrl: params.fileUrl, uploadedById: params.uploadedById },
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

export async function listLabReportTemplates(tenantId: string) {
  return db.labReportTemplate.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export async function createLabReportTemplate(params: { tenantId: string; name: string; body: string }) {
  return db.labReportTemplate.create({ data: params });
}

export async function updateLabReportTemplate(tenantId: string, templateId: string, params: { name?: string; body?: string }) {
  return db.labReportTemplate.updateMany({ where: { id: templateId, tenantId }, data: params });
}
