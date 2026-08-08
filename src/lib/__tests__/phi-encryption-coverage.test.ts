import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createLabOrder, recordLabResult, listLabOrders } from "@/lib/lab";
import { createImagingOrder, listImagingOrders, getImagingStudy } from "@/lib/imaging";
import { recordVitals, listVitalsForPatient } from "@/lib/vitals";

// Regression coverage for extending PHI encryption beyond VisitRecord/
// FollowUp to lab results and imaging order descriptions (see COMPLIANCE.md).
// Same pattern each time: ciphertext at rest (raw DB read), plaintext on
// every real read path (the lib functions callers actually use).

let tenantId: string;
let patientId: string;
let doctorId: string;
let staffUserId: string;
let labTestId: string;
const createdAppointmentIds: string[] = [];
const createdImagingOrderIds: string[] = [];
const createdVitalsIds: string[] = [];

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
    await db.labOrderItem.deleteMany({ where: { labOrder: { appointmentId: id } } });
    await db.labOrder.deleteMany({ where: { appointmentId: id } });
    await db.patientJourneyEvent.deleteMany({ where: { appointmentId: id } });
    await db.appointment.delete({ where: { id } });
  }
  for (const id of createdImagingOrderIds.splice(0)) {
    await db.imagingStudy.deleteMany({ where: { imagingOrderId: id } });
    await db.imagingOrder.delete({ where: { id } }).catch(() => {});
  }
  for (const id of createdVitalsIds.splice(0)) {
    await db.vitals.delete({ where: { id } }).catch(() => {});
  }
});

describe("lab result encryption", () => {
  it("stores resultValue/referenceRange encrypted and decrypts them on the listLabOrders read path", async () => {
    const appointment = await db.appointment.create({
      data: { tenantId, doctorId, patientId, datetime: new Date(), type: "NEW", serviceType: "CONSULTATION", source: "MANUAL" },
    });
    createdAppointmentIds.push(appointment.id);

    const order = await createLabOrder({
      tenantId,
      patientId,
      appointmentId: appointment.id,
      orderedById: staffUserId,
      testIds: [labTestId],
      patientConsentedAt: new Date(),
    });
    const [item] = order.items;

    await recordLabResult(tenantId, item.id, {
      resultValue: "PHI-CHECK-11.2",
      referenceRange: "PHI-CHECK-range",
    });

    const raw = await db.labOrderItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(raw.resultValue?.startsWith("enc:v1:")).toBe(true);
    expect(raw.referenceRange?.startsWith("enc:v1:")).toBe(true);

    const orders = await listLabOrders(tenantId, { patientId });
    const found = orders.find((o) => o.id === order.id)!;
    expect(found.items[0].resultValue).toBe("PHI-CHECK-11.2");
    expect(found.items[0].referenceRange).toBe("PHI-CHECK-range");
  });
});

describe("imaging order description encryption", () => {
  it("stores description encrypted and decrypts it on listImagingOrders and getImagingStudy", async () => {
    const order = await createImagingOrder({
      tenantId,
      patientId,
      orderedById: staffUserId,
      modality: "XRAY",
      description: "PHI-CHECK: rule out fracture, left wrist",
      patientConsentedAt: new Date(),
    });
    createdImagingOrderIds.push(order.id);

    const raw = await db.imagingOrder.findUniqueOrThrow({ where: { id: order.id } });
    expect(raw.description?.startsWith("enc:v1:")).toBe(true);

    const list = await listImagingOrders(tenantId, { patientId });
    const found = list.find((o) => o.id === order.id)!;
    expect(found.description).toBe("PHI-CHECK: rule out fracture, left wrist");

    const study = await db.imagingStudy.create({
      data: { imagingOrderId: order.id, uploadedById: staffUserId, studyInstanceUid: `phi-check-${Date.now()}` },
    });
    const fetched = await getImagingStudy(tenantId, study.id);
    expect(fetched?.imagingOrder.description).toBe("PHI-CHECK: rule out fracture, left wrist");
  });
});

describe("vitals bp encryption", () => {
  it("stores bp encrypted and decrypts it on the listVitalsForPatient read path", async () => {
    const vitals = await recordVitals({ tenantId, patientId, bp: "PHI-CHECK-120/80" });
    createdVitalsIds.push(vitals.id);

    const raw = await db.vitals.findUniqueOrThrow({ where: { id: vitals.id } });
    expect(raw.bp?.startsWith("enc:v1:")).toBe(true);

    const list = await listVitalsForPatient(patientId, tenantId);
    const found = list.find((v) => v.id === vitals.id)!;
    expect(found.bp).toBe("PHI-CHECK-120/80");
  });
});
