import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Role, UserStatus } from "@prisma/client";

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

export async function updateStaffRole(tenantId: string, userId: string, role: Role) {
  if (NON_STAFF_ROLES.has(role)) {
    throw new Error(`Role ${role} has its own dedicated flow — not managed via staff role changes.`);
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
}) {
  if (NON_STAFF_ROLES.has(params.role)) {
    throw new Error(`Role ${params.role} has its own dedicated creation flow.`);
  }

  const existing = await db.user.findUnique({ where: { email: params.email } });
  if (existing) throw new Error(`A user with email ${params.email} already exists`);

  const passwordHash = await bcrypt.hash(params.password, 10);

  return db.user.create({
    data: {
      email: params.email,
      name: params.name,
      phone: params.phone,
      role: params.role,
      passwordHash,
      tenantId: params.tenantId,
    },
  });
}
