import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createLabOrder, recordLabResult, updateLabOrderStatus, approveLabOrder, generateAndAttachLabReport } from "@/lib/lab";

// Regression tests for two new requirements: a lab order cannot be created
// without recorded patient consent, and the report attached on approval is a
// real, app-generated PDF (not a manually-pasted URL) — the visualization on
// the patient's chart still reads the structured result fields directly, so
// nothing here parses the PDF back out.

let tenantId: string;
let patientId: string;
let doctorId: string;
let staffUserId: string;
let labTestId: string;
const createdAppointmentIds: string[] = [];

beforeAll(async () => {
  const tenant = await db.tenant.findFirstOrThrow();
  const patient = await db.patient.findFirstOrThrow({ where: { tenantId: tenant.id } });
  const doctor = await db.doctor.findFirstOrThrow({ where: { tenantId: tenant.id }, include: { user: true } });
  const labTest = await db.labTestCatalog.findFirstOrThrow({ where: { tenantId: tenant.id } });
  tenantId = tenant.id;
  patientId = patient.id;
  doctorId = doctor.id;
  staffUserId = doctor.user.id;
  labTestId = labTest.id;
});

afterEach(async () => {
  for (const id of createdAppointmentIds.splice(0)) {
    await db.labReport.deleteMany({ where: { labOrder: { appointmentId: id } } });
    await db.labOrderItem.deleteMany({ where: { labOrder: { appointmentId: id } } });
    await db.labOrder.deleteMany({ where: { appointmentId: id } });
    await db.patientJourneyEvent.deleteMany({ where: { appointmentId: id } });
    await db.appointment.delete({ where: { id } });
  }
});

async function makeAppointment() {
  const appointment = await db.appointment.create({
    data: { tenantId, doctorId, patientId, datetime: new Date(), type: "NEW", serviceType: "CONSULTATION", source: "MANUAL" },
  });
  createdAppointmentIds.push(appointment.id);
  return appointment;
}

describe("createLabOrder consent requirement", () => {
  it("requires patientConsentedAt to create an order", async () => {
    const appointment = await makeAppointment();
    // @ts-expect-error — intentionally omitting the required field to prove the type contract
    await expect(createLabOrder({ tenantId, patientId, appointmentId: appointment.id, orderedById: staffUserId, testIds: [labTestId] })).rejects.toThrow();
  });

  it("creates the order when consent is recorded", async () => {
    const appointment = await makeAppointment();
    const order = await createLabOrder({
      tenantId,
      patientId,
      appointmentId: appointment.id,
      orderedById: staffUserId,
      testIds: [labTestId],
      patientConsentedAt: new Date(),
    });
    expect(order.id).toBeTruthy();
  });
});

describe("generateAndAttachLabReport", () => {
  it("generates a real PDF and attaches it with a resolvable fileUrl", async () => {
    const appointment = await makeAppointment();
    const order = await createLabOrder({
      tenantId,
      patientId,
      appointmentId: appointment.id,
      orderedById: staffUserId,
      testIds: [labTestId],
      patientConsentedAt: new Date(),
    });

    await recordLabResult(tenantId, order.items[0].id, { resultValue: "5.2", resultUnit: "x10^9/L", referenceRange: "4-11", flag: "NORMAL" });
    await updateLabOrderStatus(tenantId, order.id, "COMPLETED");
    await approveLabOrder(tenantId, order.id, staffUserId);

    const report = await generateAndAttachLabReport(tenantId, order.id, staffUserId, "http://localhost:3000");

    expect(report.fileUrl).toBe(`http://localhost:3000/api/lab-reports/${report.id}/pdf`);
    expect(report.pdfData).not.toBeNull();
    // %PDF magic header — confirms this is a real PDF document, not placeholder bytes
    expect(Buffer.from(report.pdfData!).subarray(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("refuses to generate a report before the order is approved", async () => {
    const appointment = await makeAppointment();
    const order = await createLabOrder({
      tenantId,
      patientId,
      appointmentId: appointment.id,
      orderedById: staffUserId,
      testIds: [labTestId],
      patientConsentedAt: new Date(),
    });

    await expect(generateAndAttachLabReport(tenantId, order.id, staffUserId, "http://localhost:3000")).rejects.toThrow(
      "must be approved"
    );
  });
});
