import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createLabOrder, linkLabOrdersToFollowUp } from "@/lib/lab";
import { createFollowUp } from "@/lib/followUps";
import { sendLabReportViaWhatsApp } from "@/lib/whatsapp";

// Regression tests for the second-visit lab workflow: a lab test ordered
// during a visit gets linked to the follow-up prescribed at that same
// visit (rather than requiring the doctor to pick one manually), and
// sending a lab report creates an outbound WhatsAppMessage.

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
    await db.followUpCallLog.deleteMany({ where: { followUp: { appointmentId: id } } });
    await db.followUp.deleteMany({ where: { appointmentId: id } });
    await db.patientJourneyEvent.deleteMany({ where: { appointmentId: id } });
    await db.appointment.delete({ where: { id } });
  }
});

describe("linkLabOrdersToFollowUp", () => {
  it("links a lab order from the same visit to a newly prescribed follow-up", async () => {
    const appointment = await db.appointment.create({
      data: { tenantId, doctorId, patientId, datetime: new Date(), type: "NEW", serviceType: "CONSULTATION", source: "MANUAL" },
    });
    createdAppointmentIds.push(appointment.id);

    const labOrder = await createLabOrder({
      tenantId,
      patientId,
      appointmentId: appointment.id,
      orderedById: staffUserId,
      testIds: [labTestId],
      patientConsentedAt: new Date(),
    });

    const followUp = await createFollowUp({
      tenantId,
      appointmentId: appointment.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      focusInstructions: "Check if the results came back normal",
      prescribedById: staffUserId,
    });

    await linkLabOrdersToFollowUp(tenantId, appointment.id, followUp.id);

    const updatedOrder = await db.labOrder.findUniqueOrThrow({ where: { id: labOrder.id } });
    expect(updatedOrder.followUpId).toBe(followUp.id);
  });

  it("does not touch a lab order from a different appointment", async () => {
    const appointmentA = await db.appointment.create({
      data: { tenantId, doctorId, patientId, datetime: new Date(), type: "NEW", serviceType: "CONSULTATION", source: "MANUAL" },
    });
    const appointmentB = await db.appointment.create({
      data: { tenantId, doctorId, patientId, datetime: new Date(), type: "FOLLOW_UP", serviceType: "CONSULTATION", source: "MANUAL" },
    });
    createdAppointmentIds.push(appointmentA.id, appointmentB.id);

    const orderFromA = await createLabOrder({
      tenantId,
      patientId,
      appointmentId: appointmentA.id,
      orderedById: staffUserId,
      testIds: [labTestId],
      patientConsentedAt: new Date(),
    });

    const followUp = await createFollowUp({
      tenantId,
      appointmentId: appointmentB.id,
      dueDate: new Date(),
      focusInstructions: "Unrelated follow-up",
      prescribedById: staffUserId,
    });

    await linkLabOrdersToFollowUp(tenantId, appointmentB.id, followUp.id);

    const unchanged = await db.labOrder.findUniqueOrThrow({ where: { id: orderFromA.id } });
    expect(unchanged.followUpId).toBeNull();
  });
});

describe("sendLabReportViaWhatsApp", () => {
  it("creates an outbound WhatsAppMessage when a report is sent", async () => {
    const appointment = await db.appointment.create({
      data: { tenantId, doctorId, patientId, datetime: new Date(), type: "NEW", serviceType: "CONSULTATION", source: "MANUAL" },
    });
    createdAppointmentIds.push(appointment.id);

    const labOrder = await createLabOrder({
      tenantId,
      patientId,
      appointmentId: appointment.id,
      orderedById: staffUserId,
      testIds: [labTestId],
      patientConsentedAt: new Date(),
    });

    const report = await db.labReport.create({
      data: { labOrderId: labOrder.id, fileUrl: "https://example.com/report.pdf", uploadedById: staffUserId },
    });

    const message = await sendLabReportViaWhatsApp({ tenantId, labReportId: report.id, toPhone: "+919999999999" });

    expect(message.direction).toBe("OUTBOUND");

    await db.whatsAppMessage.delete({ where: { id: message.id } });
  });
});
