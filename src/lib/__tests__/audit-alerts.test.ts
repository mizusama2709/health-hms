import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { runAuditAlerts } from "@/lib/auditAlerts";
import type { Prisma } from "@prisma/client";

// Regression coverage for the audit-alerts job: AuditLog existed and was
// being written to, but nothing ever consumed it — a SUPER_ADMIN grant or
// a bulk report export produced a row nobody would see unless they went
// looking. This job is what surfaces those rows as real notifications.

let tenantId: string;
const createdAuditLogIds: string[] = [];

beforeAll(async () => {
  const tenant = await db.tenant.findFirstOrThrow();
  tenantId = tenant.id;
});

afterEach(async () => {
  for (const id of createdAuditLogIds.splice(0)) {
    await db.auditLog.delete({ where: { id } }).catch(() => {});
  }
  await db.notification.deleteMany({ where: { tenantId, type: "SECURITY_ALERT" } });
});

async function writeAudit(action: string, meta?: Prisma.InputJsonValue) {
  await logAudit({ tenantId, userEmail: "auditor@example.com", action, entityType: "Test", meta });
  const row = await db.auditLog.findFirstOrThrow({ where: { tenantId, action }, orderBy: { createdAt: "desc" } });
  createdAuditLogIds.push(row.id);
  return row;
}

describe("runAuditAlerts", () => {
  it("notifies on a SUPER_ADMIN role grant and marks the row alerted", async () => {
    const row = await writeAudit("STAFF_ROLE_CHANGE", { fromRole: "ADMIN_RECEPTION", toRole: "SUPER_ADMIN" });

    const summary = await runAuditAlerts();

    expect(summary.roleEscalations).toBeGreaterThanOrEqual(1);
    const updated = await db.auditLog.findUniqueOrThrow({ where: { id: row.id } });
    expect(updated.alertedAt).not.toBeNull();

    const notification = await db.notification.findFirst({
      where: { tenantId, type: "SECURITY_ALERT", title: "SUPER_ADMIN role granted" },
    });
    expect(notification).not.toBeNull();
  });

  it("ignores a role change that isn't to SUPER_ADMIN", async () => {
    const row = await writeAudit("STAFF_ROLE_CHANGE", { fromRole: "NURSE", toRole: "RECEPTIONIST" });

    await runAuditAlerts();

    const updated = await db.auditLog.findUniqueOrThrow({ where: { id: row.id } });
    expect(updated.alertedAt).toBeNull();
  });

  it("never double-alerts once a row is marked alerted", async () => {
    await writeAudit("STAFF_ROLE_CHANGE", { fromRole: "NURSE", toRole: "SUPER_ADMIN" });

    await runAuditAlerts();
    const countBefore = await db.notification.count({ where: { tenantId, type: "SECURITY_ALERT" } });
    await runAuditAlerts();
    const countAfter = await db.notification.count({ where: { tenantId, type: "SECURITY_ALERT" } });

    expect(countAfter).toBe(countBefore);
  });

  it("notifies on a report export", async () => {
    await writeAudit("REPORT_EXPORT", { rowCount: 500 });

    const summary = await runAuditAlerts();

    expect(summary.exports).toBeGreaterThanOrEqual(1);
    const notification = await db.notification.findFirst({
      where: { tenantId, type: "SECURITY_ALERT", title: "Report exported" },
    });
    expect(notification).not.toBeNull();
  });

  it("notifies when one user views an unusually high number of patient charts within an hour", async () => {
    const suspiciousEmail = `bulk-view-${Date.now()}@example.com`;
    for (let i = 0; i < 20; i++) {
      await logAudit({ tenantId, userId: "bulk-view-test-user", userEmail: suspiciousEmail, action: "PATIENT_VIEW", entityType: "Patient" });
    }
    const rows = await db.auditLog.findMany({ where: { tenantId, userEmail: suspiciousEmail } });
    createdAuditLogIds.push(...rows.map((r) => r.id));

    const summary = await runAuditAlerts();

    expect(summary.bulkAccess).toBeGreaterThanOrEqual(1);
    const notification = await db.notification.findFirst({
      where: { tenantId, type: "SECURITY_ALERT", title: "Unusually high patient-record access" },
    });
    expect(notification).not.toBeNull();
  });
});
