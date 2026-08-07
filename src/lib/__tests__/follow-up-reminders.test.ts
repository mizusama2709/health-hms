import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createFollowUp, scheduleReminder } from "@/lib/followUps";
import { runFollowUpReminders } from "@/lib/followUpReminders";

// Regression coverage for the reminder dispatcher (previously the follow-up
// reminder job referenced in ARCHITECTURE.md didn't exist at all — staff
// could schedule a reminder via the Reminders page, but nothing ever sent
// it). Verifies the dispatch window, the reminderSentAt dedupe guard so a
// second run never double-sends, and the no-phone terminal case.

let tenantId: string;
let doctorId: string;
let staffUserId: string;
const createdAppointmentIds: string[] = [];
const createdUserIds: string[] = [];

beforeAll(async () => {
  const tenant = await db.tenant.findFirstOrThrow();
  const doctor = await db.doctor.findFirstOrThrow({ where: { tenantId: tenant.id }, include: { user: true } });
  tenantId = tenant.id;
  doctorId = doctor.id;
  staffUserId = doctor.user.id;
});

afterEach(async () => {
  for (const id of createdAppointmentIds.splice(0)) {
    await db.whatsAppMessage.deleteMany({ where: { relatedFollowUpId: { in: await followUpIdsFor(id) } } });
    await db.followUp.deleteMany({ where: { appointmentId: id } });
    await db.appointment.delete({ where: { id } });
  }
  for (const id of createdUserIds.splice(0)) {
    await db.patient.deleteMany({ where: { userId: id } });
    await db.user.delete({ where: { id } }).catch(() => {});
  }
});

async function followUpIdsFor(appointmentId: string) {
  const rows = await db.followUp.findMany({ where: { appointmentId }, select: { id: true } });
  return rows.map((r) => r.id);
}

async function makeScheduledReminder(params: { reminderAt: Date; phone: string | null }) {
  const user = await db.user.create({
    data: {
      tenantId,
      email: `reminder-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      name: "Reminder Test Patient",
      role: "PATIENT",
      passwordHash: "unused",
      phone: params.phone,
      patient: { create: { tenantId } },
    },
    include: { patient: true },
  });
  createdUserIds.push(user.id);

  const appointment = await db.appointment.create({
    data: {
      tenantId,
      doctorId,
      patientId: user.patient!.id,
      datetime: new Date(),
      type: "NEW",
      serviceType: "CONSULTATION",
      source: "MANUAL",
    },
  });
  createdAppointmentIds.push(appointment.id);

  const followUp = await createFollowUp({
    tenantId,
    appointmentId: appointment.id,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    focusInstructions: "Check in on symptoms",
    prescribedById: staffUserId,
  });

  await scheduleReminder({
    tenantId,
    followUpId: followUp.id,
    reminderAt: params.reminderAt,
    reminderMessage: "How are you feeling? Reply to let us know.",
  });

  return followUp;
}

describe("runFollowUpReminders", () => {
  it("sends and marks reminderSentAt for a reminder whose time has come", async () => {
    const followUp = await makeScheduledReminder({ reminderAt: new Date(Date.now() - 60_000), phone: "+919812300001" });

    const summary = await runFollowUpReminders();

    expect(summary.sent).toBeGreaterThanOrEqual(1);
    const updated = await db.followUp.findUniqueOrThrow({ where: { id: followUp.id } });
    expect(updated.reminderSentAt).not.toBeNull();

    const message = await db.whatsAppMessage.findFirst({ where: { relatedFollowUpId: followUp.id } });
    expect(message?.status).toBe("SIMULATED");
  });

  it("does not send a reminder scheduled for the future", async () => {
    const followUp = await makeScheduledReminder({
      reminderAt: new Date(Date.now() + 60 * 60 * 1000),
      phone: "+919812300002",
    });

    await runFollowUpReminders();

    const updated = await db.followUp.findUniqueOrThrow({ where: { id: followUp.id } });
    expect(updated.reminderSentAt).toBeNull();
  });

  it("never double-sends once reminderSentAt is set", async () => {
    const followUp = await makeScheduledReminder({ reminderAt: new Date(Date.now() - 60_000), phone: "+919812300003" });

    await runFollowUpReminders();
    await runFollowUpReminders();

    const count = await db.whatsAppMessage.count({ where: { relatedFollowUpId: followUp.id } });
    expect(count).toBe(1);
  });

  it("marks a phoneless patient's reminder terminally failed instead of retrying forever", async () => {
    const followUp = await makeScheduledReminder({ reminderAt: new Date(Date.now() - 60_000), phone: null });

    const summary = await runFollowUpReminders();

    expect(summary.failed).toBeGreaterThanOrEqual(1);
    const updated = await db.followUp.findUniqueOrThrow({ where: { id: followUp.id } });
    expect(updated.reminderSentAt).not.toBeNull();

    const message = await db.whatsAppMessage.findFirst({ where: { relatedFollowUpId: followUp.id } });
    expect(message?.status).toBe("FAILED");
  });
});
