"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { createStaffUser, updateStaffRole, updateStaffStatus } from "@/lib/staff";
import { withActionResult } from "@/lib/actionResult";
import type { Role, UserStatus } from "@prisma/client";

const STAFF_ADMIN_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN"] as const;

export async function createStaff(formData: FormData) {
  const session = await requireRole(...STAFF_ADMIN_ROLES);
  const tenantId = await requireTenantId();

  await createStaffUser({
    tenantId,
    email: formData.get("email") as string,
    name: formData.get("name") as string,
    phone: (formData.get("phone") as string) || undefined,
    role: formData.get("role") as Role,
    password: formData.get("password") as string,
    actingRole: session.user.role as Role,
    actor: { userId: session.user.id, userEmail: session.user.email },
  });

  revalidatePath("/admin/staff");
}

export const createStaffActionResult = withActionResult(createStaff, "Staff member added");

export async function changeStaffRole(formData: FormData) {
  const session = await requireRole(...STAFF_ADMIN_ROLES);
  const tenantId = await requireTenantId();

  const userId = formData.get("userId") as string;
  const role = formData.get("role") as Role;
  await updateStaffRole(tenantId, userId, role, session.user.role as Role, {
    userId: session.user.id,
    userEmail: session.user.email,
  });

  revalidatePath("/admin/staff");
}

export const changeStaffRoleActionResult = withActionResult(changeStaffRole, "Role updated");

export async function changeStaffStatus(formData: FormData) {
  const session = await requireRole(...STAFF_ADMIN_ROLES);
  const tenantId = await requireTenantId();

  const userId = formData.get("userId") as string;
  const status = formData.get("status") as UserStatus;
  await updateStaffStatus(tenantId, userId, status, { userId: session.user.id, userEmail: session.user.email });

  revalidatePath("/admin/staff");
}

export const changeStaffStatusActionResult = withActionResult(changeStaffStatus, "Status updated");
