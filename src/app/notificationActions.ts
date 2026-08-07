"use server";

import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/notifications";

export async function fetchNotificationsAction() {
  const session = await auth();
  const tenantId = await requireTenantId();
  if (!session?.user?.id) return [];
  return listNotifications(tenantId, session.user.id);
}

export async function markNotificationReadAction(notificationId: string) {
  const session = await auth();
  const tenantId = await requireTenantId();
  if (!session?.user?.id) return;
  await markNotificationRead(tenantId, session.user.id, notificationId);
}

export async function markAllNotificationsReadAction() {
  const session = await auth();
  const tenantId = await requireTenantId();
  if (!session?.user?.id) return;
  await markAllNotificationsRead(tenantId, session.user.id);
}
