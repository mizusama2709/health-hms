import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ROLE_HOME: Record<string, string> = {
  PATIENT: "/patient",
  DOCTOR: "/doctor",
  ADMIN_RECEPTION: "/admin",
  SUPER_ADMIN: "/admin",
};

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role as string | undefined;

  const isPatientRoute = pathname.startsWith("/patient");
  const isDoctorRoute = pathname.startsWith("/doctor");
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtected = isPatientRoute || isDoctorRoute || isAdminRoute;

  if (!isProtected) return NextResponse.next();

  if (!role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const allowed =
    (isPatientRoute && role === "PATIENT") ||
    (isDoctorRoute && role === "DOCTOR") ||
    (isAdminRoute && (role === "ADMIN_RECEPTION" || role === "SUPER_ADMIN"));

  if (!allowed) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/patient/:path*", "/doctor/:path*", "/admin/:path*"],
};
