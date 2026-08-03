import type { Role } from "@prisma/client";

export const ROLE_HOME: Record<Role, string> = {
  PATIENT: "/login",
  DOCTOR: "/doctor",
  ADMIN_RECEPTION: "/admin",
  SUPER_ADMIN: "/admin",
  NURSE: "/admin",
  RECEPTIONIST: "/admin",
  LAB: "/admin",
  PHARMACIST: "/admin",
};

/**
 * Reception only needs the front-desk workflow — patients, booking, queue,
 * inbox. Everything else under /admin (billing internals, pharmacy, lab,
 * reports, staff, settings) is admin/super-admin only. Checked both in the
 * proxy (route access) and the admin nav (what's shown), so hiding a link
 * and blocking the route never drift apart.
 */
export const RECEPTIONIST_ALLOWED_PREFIXES = [
  "/admin/patients",
  "/admin/inbox",
  "/admin/schedule",
  "/admin/queue",
];

export function isReceptionistAllowed(pathname: string) {
  if (pathname === "/admin") return true;
  return RECEPTIONIST_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
}
