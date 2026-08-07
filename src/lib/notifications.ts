import { db } from "@/lib/db";

export type NotificationType =
  | "APPOINTMENT_BOOKED"
  | "APPOINTMENT_CANCELLED"
  | "LAB_RESULT_CRITICAL"
  | "SECURITY_ALERT"
  | "WHATSAPP_DELIVERY_FAILED";

// userId omitted/null broadcasts to everyone in the tenant — the audit
// alerts job (SECURITY_ALERT) is the first real use of that: there's no
// single target user for "someone granted SUPER_ADMIN", the whole tenant's
// admin console should see it.
export async function notify(params: {
  tenantId: string;
  userId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
}) {
  await db.notification.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      type: params.type,
      title: params.title,
      body: params.body,
      href: params.href,
    },
  });
}

function visibleTo(tenantId: string, userId: string) {
  return { tenantId, OR: [{ userId }, { userId: null }] };
}

export async function listNotifications(tenantId: string, userId: string, limit = 20) {
  return db.notification.findMany({
    where: visibleTo(tenantId, userId),
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadNotificationCount(tenantId: string, userId: string) {
  return db.notification.count({
    where: { ...visibleTo(tenantId, userId), readAt: null },
  });
}

export async function markNotificationRead(tenantId: string, userId: string, notificationId: string) {
  await db.notification.updateMany({
    where: { ...visibleTo(tenantId, userId), id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(tenantId: string, userId: string) {
  await db.notification.updateMany({
    where: { ...visibleTo(tenantId, userId), readAt: null },
    data: { readAt: new Date() },
  });
}
