import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ROLE_HOME } from "@/lib/roles";
import type { Role } from "@prisma/client";

const ADMIN_CONSOLE_ROLES = new Set<Role>([
  "ADMIN_RECEPTION",
  "SUPER_ADMIN",
  "NURSE",
  "RECEPTIONIST",
  "LAB",
  "PHARMACIST",
]);

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role as Role | undefined;

  const isPatientRoute = pathname.startsWith("/patient");
  const isDoctorRoute = pathname.startsWith("/doctor");
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtected = isPatientRoute || isDoctorRoute || isAdminRoute;

  if (!isProtected) return NextResponse.next();

  if (!role) {
    // Temporary: skip the login screen, auto-sign in as the demo admin.
    // Revert to `NextResponse.redirect(new URL("/login", req.url))` to restore real login.
    return NextResponse.redirect(new URL(`/api/auto-login?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
  }

  const allowed =
    (isPatientRoute && role === "PATIENT") ||
    (isDoctorRoute && role === "DOCTOR") ||
    (isAdminRoute && ADMIN_CONSOLE_ROLES.has(role));

  if (!allowed) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/patient/:path*", "/doctor/:path*", "/admin/:path*"],
};
