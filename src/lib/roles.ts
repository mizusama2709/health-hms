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
 * Every non-admin /admin-console role is scoped to just the prefixes its
 * job needs — staff management, org settings, and cross-department billing
 * stay admin/super-admin only. A role with no entry here (ADMIN_RECEPTION,
 * SUPER_ADMIN) gets unrestricted access. Checked both in the proxy (route
 * access) and the admin nav (what's shown), so hiding a link and blocking
 * the route never drift apart.
 */
export const ROLE_ALLOWED_PREFIXES: Partial<Record<Role, string[]>> = {
  RECEPTIONIST: ["/admin/patients", "/admin/inbox", "/admin/schedule", "/admin/queue"],
  NURSE: ["/admin/patients", "/admin/inbox", "/admin/schedule", "/admin/queue"],
  LAB: ["/admin/patients", "/admin/lab", "/admin/queue"],
  PHARMACIST: ["/admin/patients", "/admin/pharmacy", "/admin/queue"],
};

export function isAdminRouteAllowed(role: Role, pathname: string): boolean {
  const prefixes = ROLE_ALLOWED_PREFIXES[role];
  if (!prefixes) return true;
  if (pathname === "/admin") return true;
  return prefixes.some((p) => pathname.startsWith(p));
}
