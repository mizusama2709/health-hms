import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createFollowUp, logFollowUpCall, cancelFollowUp, listFollowUps } from "@/lib/followUps";
import { decryptPHI } from "@/lib/phiCrypto";

// Regression tests for the doctor-prescribed follow-up feature: a FollowUp
// is now only ever created explicitly (never auto-created on visit
// completion), and its status is derived from FollowUpCallLog outcomes
// rather than a free-text setter.

let tenantId: string;
let patientId: string;
let doctorId: string;
let staffUserId: string;
const createdAppointmentIds: string[] = [];

beforeAll(async () => {
  const tenant = await db.tenant.findFirstOrThrow();
  const patient = await db.patient.findFirstOrThrow({ where: { tenantId: tenant.id } });
  const doctor = await db.doctor.findFirstOrThrow({ where: { tenantId: tenant.id }, include: { user: true } });
  tenantId = tenant.id;
  patientId = patient.id;
  doctorId = doctor.id;
  staffUserId = doctor.user.id;
});

afterEach(async () => {
  for (const id of createdAppointmentIds.splice(0)) {
    await db.followUpCallLog.deleteMany({ where: { followUp: { appointmentId: id } } });
    await db.followUp.deleteMany({ where: { appointmentId: id } });
    await db.appointment.delete({ where: { id } });
  }
});

async function makeAppointmentWithFollowUp(dueDate: Date) {
  const appointment = await db.appointment.create({
    data: { tenantId, doctorId, patientId, datetime: new Date(), type: "NEW", serviceType: "CONSULTATION", source: "MANUAL" },
  });
  createdAppointmentIds.push(appointment.id);

  const followUp = await createFollowUp({
    tenantId,
    appointmentId: appointment.id,
    dueDate,
    focusInstructions: "Ask if the fever has subsided",
    prescribedById: staffUserId,
  });

  return { appointment, followUp };
}

describe("createFollowUp", () => {
  it("only creates a follow-up when explicitly called, with the doctor's instructions", async () => {
    const { followUp } = await makeAppointmentWithFollowUp(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    expect(followUp.status).toBe("PENDING");
    // createFollowUp returns the raw row — focusInstructions is PHI and
    // stored encrypted; decryption only happens on the listFollowUps read
    // path (covered separately below), so assert via decryptPHI here.
    expect(decryptPHI(followUp.focusInstructions)).toBe("Ask if the fever has subsided");
    expect(followUp.prescribedById).toBe(staffUserId);
  });
});

describe("listFollowUps", () => {
  it("flags a follow-up as overdue once its due date has passed", async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { followUp } = await makeAppointmentWithFollowUp(past);

    const pending = await listFollowUps(tenantId, { status: "PENDING" });
    const match = pending.find((f) => f.id === followUp.id);

    expect(match?.isOverdue).toBe(true);
  });

  it("stores focusInstructions and call-log notes encrypted, and decrypts them on read", async () => {
    const { followUp } = await makeAppointmentWithFollowUp(new Date());
    await logFollowUpCall({
      tenantId,
      followUpId: followUp.id,
      calledById: staffUserId,
      outcome: "NO_CHANGE",
      notes: "Patient reports feeling better",
      nextAction: "NONE",
    });

    const raw = await db.followUp.findUniqueOrThrow({ where: { id: followUp.id }, include: { callLogs: true } });
    expect(raw.focusInstructions.startsWith("enc:v1:")).toBe(true);
    expect(raw.callLogs[0].notes.startsWith("enc:v1:")).toBe(true);

    const list = await listFollowUps(tenantId);
    const match = list.find((f) => f.id === followUp.id)!;
    expect(match.focusInstructions).toBe("Ask if the fever has subsided");
    expect(match.callLogs[0].notes).toBe("Patient reports feeling better");
  });
});

describe("logFollowUpCall", () => {
  it("keeps status PENDING and moves the due date when another call is scheduled", async () => {
    const { followUp } = await makeAppointmentWithFollowUp(new Date());
    const nextDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    await logFollowUpCall({
      tenantId,
      followUpId: followUp.id,
      calledById: staffUserId,
      outcome: "NO_CHANGE",
      notes: "Patient still has mild symptoms, call again in 3 days",
      nextAction: "ANOTHER_CALL_SCHEDULED",
      nextFollowUpAt: nextDate,
    });

    const updated = await db.followUp.findUniqueOrThrow({ where: { id: followUp.id } });
    expect(updated.status).toBe("PENDING");
    expect(updated.dueDate.getTime()).toBe(nextDate.getTime());
  });

  it("sets status ESCALATED when the next action is escalate-to-doctor", async () => {
    const { followUp } = await makeAppointmentWithFollowUp(new Date());

    await logFollowUpCall({
      tenantId,
      followUpId: followUp.id,
      calledById: staffUserId,
      outcome: "ADVERSE_REACTION",
      notes: "Patient reports a rash — doctor should review",
      nextAction: "ESCALATE_TO_DOCTOR",
    });

    const updated = await db.followUp.findUniqueOrThrow({ where: { id: followUp.id } });
    expect(updated.status).toBe("ESCALATED");
  });

  it("sets status COMPLETED when the outcome resolves the follow-up", async () => {
    const { followUp } = await makeAppointmentWithFollowUp(new Date());

    await logFollowUpCall({
      tenantId,
      followUpId: followUp.id,
      calledById: staffUserId,
      outcome: "RESOLVED",
      notes: "Patient fully recovered",
      nextAction: "NONE",
    });

    const updated = await db.followUp.findUniqueOrThrow({ where: { id: followUp.id } });
    expect(updated.status).toBe("COMPLETED");

    const logs = await db.followUpCallLog.findMany({ where: { followUpId: followUp.id } });
    expect(logs).toHaveLength(1);
  });
});

describe("cancelFollowUp", () => {
  it("sets status CANCELLED", async () => {
    const { followUp } = await makeAppointmentWithFollowUp(new Date());

    await cancelFollowUp(tenantId, followUp.id);

    const updated = await db.followUp.findUniqueOrThrow({ where: { id: followUp.id } });
    expect(updated.status).toBe("CANCELLED");
  });
});
