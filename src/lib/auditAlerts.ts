import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";

const SCAN_WINDOW_MS = 24 * 60 * 60 * 1000;
const BULK_VIEW_WINDOW_MS = 60 * 60 * 1000;
const BULK_VIEW_THRESHOLD = 20;

export type AuditAlertRunSummary = { roleEscalations: number; exports: number; bulkAccess: number };

// Scans AuditLog for patterns worth a human looking at, and raises them
// through the existing Notification system rather than requiring anyone to
// go read raw audit rows. Deliberately narrow — three concrete rules, not a
// general anomaly detector — because false positives train staff to ignore
// the bell.
export async function runAuditAlerts(now: Date = new Date()): Promise<AuditAlertRunSummary> {
  const since = new Date(now.getTime() - SCAN_WINDOW_MS);

  let roleEscalations = 0;
  let exports = 0;

  // Rule A — granting SUPER_ADMIN is always alert-worthy, exactly the
  // vector a prior privilege-escalation fix closed off at the route level;
  // this is the "notice if someone tries anyway, or if a legitimate grant
  // still deserves a second set of eyes" backstop.
  const escalations = await db.auditLog.findMany({
    where: { action: "STAFF_ROLE_CHANGE", alertedAt: null, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  for (const row of escalations) {
    const meta = row.meta as { toRole?: string; fromRole?: string } | null;
    if (meta?.toRole !== "SUPER_ADMIN") continue;
    await notify({
      tenantId: row.tenantId,
      type: "SECURITY_ALERT",
      title: "SUPER_ADMIN role granted",
      body: `${row.userEmail ?? "Someone"} changed a staff member's role to SUPER_ADMIN.`,
      href: "/admin/staff",
    });
    await db.auditLog.update({ where: { id: row.id }, data: { alertedAt: now } });
    roleEscalations++;
  }

  // Rule B — bulk financial/patient data leaving the app as a file.
  const reportExports = await db.auditLog.findMany({
    where: { action: "REPORT_EXPORT", alertedAt: null, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  for (const row of reportExports) {
    await notify({
      tenantId: row.tenantId,
      type: "SECURITY_ALERT",
      title: "Report exported",
      body: `${row.userEmail ?? "Someone"} exported ${row.entityType.replace("Export", "").toLowerCase()} data.`,
      href: "/admin/reports",
    });
    await db.auditLog.update({ where: { id: row.id }, data: { alertedAt: now } });
    exports++;
  }

  // Rule C — one user viewing an unusually large number of patient charts
  // in a short window. No persistent dedupe here (unlike A/B, this isn't
  // one discrete row): a sustained spree re-alerting on each run is an
  // accepted trade-off over adding another table just to suppress it.
  const windowStart = new Date(now.getTime() - BULK_VIEW_WINDOW_MS);
  const recentViews = await db.auditLog.groupBy({
    by: ["tenantId", "userId", "userEmail"],
    where: { action: "PATIENT_VIEW", createdAt: { gte: windowStart } },
    _count: { _all: true },
  });
  let bulkAccess = 0;
  for (const group of recentViews) {
    if (group._count._all < BULK_VIEW_THRESHOLD || !group.userId) continue;
    await notify({
      tenantId: group.tenantId,
      type: "SECURITY_ALERT",
      title: "Unusually high patient-record access",
      body: `${group.userEmail ?? "A user"} viewed ${group._count._all} patient charts in the last hour.`,
      href: "/admin/staff",
    });
    bulkAccess++;
  }

  return { roleEscalations, exports, bulkAccess };
}
