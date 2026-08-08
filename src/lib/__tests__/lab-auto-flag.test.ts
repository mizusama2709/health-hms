import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createLabOrder, recordLabResult } from "@/lib/lab";
import { decryptPHI } from "@/lib/phiCrypto";

// Regression tests for auto-flagging: recordLabResult should infer
// NORMAL/ABNORMAL (never CRITICAL — see lab.ts) and auto-fill the reference
// range display, but only when the ordered test has exactly one parameter
// (a single resultValue can't be matched against a multi-analyte panel), and
// never when staff has already supplied their own flag or range.

let tenantId: string;
let patientId: string;
let doctorId: string;
let staffUserId: string;
let numericTestId: string;
let qualitativeTestId: string;
let unboundedTestId: string;
let panelTestId: string;
const createdAppointmentIds: string[] = [];
const createdLabTestIds: string[] = [];

beforeAll(async () => {
  const tenant = await db.tenant.findFirstOrThrow();
  const patient = await db.patient.findFirstOrThrow({ where: { tenantId: tenant.id } });
  const doctor = await db.doctor.findFirstOrThrow({ where: { tenantId: tenant.id }, include: { user: true } });
  tenantId = tenant.id;
  patientId = patient.id;
  doctorId = doctor.id;
  staffUserId = doctor.user.id;

  const numericTest = await db.labTestCatalog.create({
    data: { tenantId, name: "Auto-flag test: numeric", defaultPrice: 0 },
  });
  await db.labTestParameter.create({
    data: { labTestId: numericTest.id, name: "Potassium", unit: "mmol/L", referenceLow: 3.5, referenceHigh: 5.1 },
  });
  numericTestId = numericTest.id;
  createdLabTestIds.push(numericTest.id);

  const qualitativeTest = await db.labTestCatalog.create({
    data: { tenantId, name: "Auto-flag test: qualitative", defaultPrice: 0 },
  });
  await db.labTestParameter.create({
    data: { labTestId: qualitativeTest.id, name: "HBsAg", referenceText: "Non-reactive" },
  });
  qualitativeTestId = qualitativeTest.id;
  createdLabTestIds.push(qualitativeTest.id);

  const unboundedTest = await db.labTestCatalog.create({
    data: { tenantId, name: "Auto-flag test: unbounded upper", defaultPrice: 0 },
  });
  await db.labTestParameter.create({
    data: { labTestId: unboundedTest.id, name: "AFP", unit: "ng/mL", referenceHigh: 7.0 },
  });
  unboundedTestId = unboundedTest.id;
  createdLabTestIds.push(unboundedTest.id);

  const panelTest = await db.labTestCatalog.create({
    data: { tenantId, name: "Auto-flag test: panel (2 params)", defaultPrice: 0 },
  });
  await db.labTestParameter.createMany({
    data: [
      { labTestId: panelTest.id, name: "Sodium", unit: "mmol/L", referenceLow: 136, referenceHigh: 145 },
      { labTestId: panelTest.id, name: "Chloride", unit: "mmol/L", referenceLow: 98, referenceHigh: 107 },
    ],
  });
  panelTestId = panelTest.id;
  createdLabTestIds.push(panelTest.id);
});

afterAll(async () => {
  await db.labTestParameter.deleteMany({ where: { labTestId: { in: createdLabTestIds } } });
  await db.labTestCatalog.deleteMany({ where: { id: { in: createdLabTestIds } } });
});

afterEach(async () => {
  for (const id of createdAppointmentIds.splice(0)) {
    await db.labOrderItem.deleteMany({ where: { labOrder: { appointmentId: id } } });
    await db.labOrder.deleteMany({ where: { appointmentId: id } });
    await db.patientJourneyEvent.deleteMany({ where: { appointmentId: id } });
    await db.appointment.delete({ where: { id } });
  }
});

async function orderTest(testId: string) {
  const appointment = await db.appointment.create({
    data: { tenantId, doctorId, patientId, datetime: new Date(), type: "NEW", serviceType: "CONSULTATION", source: "MANUAL" },
  });
  createdAppointmentIds.push(appointment.id);
  const order = await createLabOrder({
    tenantId,
    patientId,
    appointmentId: appointment.id,
    orderedById: staffUserId,
    testIds: [testId],
    patientConsentedAt: new Date(),
  });
  const item = await db.labOrderItem.findFirstOrThrow({ where: { labOrderId: order.id } });
  return item.id;
}

describe("recordLabResult auto-flagging — numeric single-parameter test", () => {
  it("flags NORMAL and fills the reference range when the value is inside range", async () => {
    const itemId = await orderTest(numericTestId);
    await recordLabResult(tenantId, itemId, { resultValue: "4.2" });
    const item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.flag).toBe("NORMAL");
    expect(decryptPHI(item.referenceRange!)).toBe("3.5–5.1 mmol/L");
  });

  it("flags ABNORMAL when the value is outside range", async () => {
    const itemId = await orderTest(numericTestId);
    await recordLabResult(tenantId, itemId, { resultValue: "6.8" });
    const item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.flag).toBe("ABNORMAL");
  });

  it("does not overwrite a flag staff already chose", async () => {
    const itemId = await orderTest(numericTestId);
    await recordLabResult(tenantId, itemId, { resultValue: "8.9", flag: "CRITICAL" });
    const item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.flag).toBe("CRITICAL");
  });

  it("does not overwrite a reference range staff already typed", async () => {
    const itemId = await orderTest(numericTestId);
    await recordLabResult(tenantId, itemId, { resultValue: "4.2", referenceRange: "custom range" });
    const item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(decryptPHI(item.referenceRange!)).toBe("custom range");
  });

  it("leaves the flag unset when the value isn't a plain number", async () => {
    const itemId = await orderTest(numericTestId);
    await recordLabResult(tenantId, itemId, { resultValue: "<5" });
    const item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.flag).toBeNull();
  });

  it("recomputes on a later save instead of freezing the first auto value (regression)", async () => {
    // The UI's flag <select> shows whatever is currently stored, so a
    // second save with the dropdown left untouched submits that same
    // value back — this must not be mistaken for a deliberate choice.
    const itemId = await orderTest(numericTestId);
    await recordLabResult(tenantId, itemId, { resultValue: "4.2" }); // NORMAL
    let item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.flag).toBe("NORMAL");

    // Simulate the round-trip: the form now submits the stored flag ("NORMAL")
    // alongside a new, out-of-range result value.
    await recordLabResult(tenantId, itemId, { resultValue: "6.8", flag: item.flag! });
    item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.flag).toBe("ABNORMAL");
  });

  it("respects a deliberate manual override and keeps it on a later resave", async () => {
    const itemId = await orderTest(numericTestId);
    await recordLabResult(tenantId, itemId, { resultValue: "4.2", flag: "CRITICAL" }); // deliberate, differs from auto NORMAL
    let item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.flag).toBe("CRITICAL");
    expect(item.flagIsManual).toBe(true);

    // Round-trip with the same manual value and a still-in-range result —
    // must stay CRITICAL, not get silently downgraded back to auto NORMAL.
    await recordLabResult(tenantId, itemId, { resultValue: "4.3", flag: "CRITICAL" });
    item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.flag).toBe("CRITICAL");
  });

  it("returns to auto mode when the flag is explicitly reset to blank", async () => {
    const itemId = await orderTest(numericTestId);
    await recordLabResult(tenantId, itemId, { resultValue: "4.2", flag: "CRITICAL" });
    await recordLabResult(tenantId, itemId, { resultValue: "6.8", flag: undefined });
    const item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.flagIsManual).toBe(false);
    expect(item.flag).toBe("ABNORMAL");
  });
});

describe("recordLabResult auto-flagging — unbounded (upper-limit-only) parameter", () => {
  it("flags NORMAL below the ceiling and ABNORMAL above it", async () => {
    const belowId = await orderTest(unboundedTestId);
    await recordLabResult(tenantId, belowId, { resultValue: "3.1" });
    expect((await db.labOrderItem.findUniqueOrThrow({ where: { id: belowId } })).flag).toBe("NORMAL");

    const aboveId = await orderTest(unboundedTestId);
    await recordLabResult(tenantId, aboveId, { resultValue: "9.4" });
    expect((await db.labOrderItem.findUniqueOrThrow({ where: { id: aboveId } })).flag).toBe("ABNORMAL");
  });
});

describe("recordLabResult auto-flagging — qualitative single-parameter test", () => {
  it("flags NORMAL when the result matches the expected qualitative value", async () => {
    const itemId = await orderTest(qualitativeTestId);
    await recordLabResult(tenantId, itemId, { resultValue: "Non-reactive" });
    const item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.flag).toBe("NORMAL");
    expect(decryptPHI(item.referenceRange!)).toBe("Non-reactive");
  });

  it("flags ABNORMAL when the result contradicts the expected qualitative value", async () => {
    const itemId = await orderTest(qualitativeTestId);
    await recordLabResult(tenantId, itemId, { resultValue: "Reactive" });
    const item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.flag).toBe("ABNORMAL");
  });
});

describe("recordLabResult auto-flagging — multi-parameter panel", () => {
  it("never auto-flags, since one value can't represent several analytes", async () => {
    const itemId = await orderTest(panelTestId);
    await recordLabResult(tenantId, itemId, { resultValue: "140" });
    const item = await db.labOrderItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(item.flag).toBeNull();
    expect(item.referenceRange).toBeNull();
  });
});
