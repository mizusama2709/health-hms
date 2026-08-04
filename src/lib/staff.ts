import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Role, UserStatus } from "@prisma/client";
import { isUniqueConstraintViolation } from "@/lib/prismaErrors";

const NON_STAFF_ROLES = new Set<Role>(["PATIENT", "DOCTOR"]);

export async function listStaff(tenantId: string, filters?: { role?: Role; status?: UserStatus }) {
  return db.user.findMany({
    where: {
      tenantId,
      ...(filters?.role && { role: filters.role }),
      ...(filters?.status && { status: filters.status }),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listStaffPaged(
  tenantId: string,
  filters?: { role?: Role; status?: UserStatus; page?: number; pageSize?: number }
) {
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = filters?.pageSize ?? 50;
  const where = {
    tenantId,
    ...(filters?.role && { role: filters.role }),
    ...(filters?.status && { status: filters.status }),
  };

  const [total, staff] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { staff, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function updateStaffRole(tenantId: string, userId: string, role: Role, actingRole: Role) {
  if (NON_STAFF_ROLES.has(role)) {
    throw new Error(`Role ${role} has its own dedicated flow — not managed via staff role changes.`);
  }

  const target = await db.user.findFirstOrThrow({ where: { id: userId, tenantId } });
  // Granting SUPER_ADMIN, or changing an existing super admin's role at
  // all, must itself be done by a super admin — otherwise ADMIN_RECEPTION
  // (which can already call this) could promote itself to super admin, or
  // strip the tenant's only super admin down to a lesser role.
  if ((role === "SUPER_ADMIN" || target.role === "SUPER_ADMIN") && actingRole !== "SUPER_ADMIN") {
    throw new Error("Only a super admin can grant or change a super admin's role");
  }

  return db.user.updateMany({
    where: { id: userId, tenantId },
    data: { role },
  });
}

export async function updateStaffStatus(tenantId: string, userId: string, status: UserStatus) {
  return db.user.updateMany({
    where: { id: userId, tenantId },
    data: { status },
  });
}

export async function createStaffUser(params: {
  tenantId: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  password: string;
  actingRole: Role;
}) {
  if (NON_STAFF_ROLES.has(params.role)) {
    throw new Error(`Role ${params.role} has its own dedicated creation flow.`);
  }
  if (params.role === "SUPER_ADMIN" && params.actingRole !== "SUPER_ADMIN") {
    throw new Error("Only a super admin can create another super admin account");
  }

  const passwordHash = await bcrypt.hash(params.password, 10);

  // No pre-check by email — see the matching comment in patients.ts
  // createPatient: since email is globally unique (not per-tenant), a
  // findUnique-by-email check would tell staff at one tenant whether an
  // email is registered at *any* tenant, a cross-tenant enumeration leak.
  try {
    return await db.user.create({
      data: {
        email: params.email,
        name: params.name,
        phone: params.phone,
        role: params.role,
        passwordHash,
        tenantId: params.tenantId,
      },
    });
  } catch (e) {
    if (isUniqueConstraintViolation(e, "email")) {
      throw new Error("That email may already be registered — try a different one");
    }
    throw e;
  }
}
