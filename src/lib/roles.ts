import type { Role } from "@prisma/client";

export const ROLE_HOME: Record<Role, string> = {
  PATIENT: "/patient",
  DOCTOR: "/doctor",
  ADMIN_RECEPTION: "/admin",
  SUPER_ADMIN: "/admin",
  NURSE: "/admin",
  RECEPTIONIST: "/admin",
  LAB: "/admin",
  PHARMACIST: "/admin",
};
