import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createStaffUser, updateStaffRole } from "@/lib/staff";

// Regression tests for a privilege-escalation bug: ADMIN_RECEPTION could
// grant itself (or anyone) SUPER_ADMIN via changeStaffRoleAction/createStaff,
// since neither updateStaffRole nor createStaffUser checked who was making
// the change. Both now require actingRole === SUPER_ADMIN whenever
// SUPER_ADMIN is involved, either as the role being granted or as the
// target's current role.

let tenantId: string;
const createdUserIds: string[] = [];

afterEach(async () => {
  for (const id of createdUserIds.splice(0)) {
    await db.user.delete({ where: { id } }).catch(() => {});
  }
});

async function makeUser(role: "ADMIN_RECEPTION" | "SUPER_ADMIN" | "RECEPTIONIST") {
  const tenant = await db.tenant.findFirstOrThrow();
  tenantId = tenant.id;
  const user = await db.user.create({
    data: {
      tenantId,
      email: `privesc-test-${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      name: `Privesc test ${role}`,
      role,
      passwordHash: "unused",
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("updateStaffRole — privilege escalation guard", () => {
  it("blocks ADMIN_RECEPTION from granting itself SUPER_ADMIN", async () => {
    const receptionist = await makeUser("ADMIN_RECEPTION");
    await expect(updateStaffRole(tenantId, receptionist.id, "SUPER_ADMIN", "ADMIN_RECEPTION")).rejects.toThrow(
      /only a super admin/i
    );
    const after = await db.user.findUniqueOrThrow({ where: { id: receptionist.id } });
    expect(after.role).toBe("ADMIN_RECEPTION");
  });

  it("blocks ADMIN_RECEPTION from demoting an existing SUPER_ADMIN", async () => {
    const superAdmin = await makeUser("SUPER_ADMIN");
    await expect(updateStaffRole(tenantId, superAdmin.id, "RECEPTIONIST", "ADMIN_RECEPTION")).rejects.toThrow(
      /only a super admin/i
    );
    const after = await db.user.findUniqueOrThrow({ where: { id: superAdmin.id } });
    expect(after.role).toBe("SUPER_ADMIN");
  });

  it("allows a real SUPER_ADMIN to grant SUPER_ADMIN", async () => {
    const target = await makeUser("ADMIN_RECEPTION");
    await updateStaffRole(tenantId, target.id, "SUPER_ADMIN", "SUPER_ADMIN");
    const after = await db.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.role).toBe("SUPER_ADMIN");
  });

  it("still allows ADMIN_RECEPTION to change a non-super-admin's role", async () => {
    const target = await makeUser("RECEPTIONIST");
    await updateStaffRole(tenantId, target.id, "ADMIN_RECEPTION", "ADMIN_RECEPTION");
    const after = await db.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.role).toBe("ADMIN_RECEPTION");
  });
});

describe("createStaffUser — privilege escalation guard", () => {
  it("blocks ADMIN_RECEPTION from creating a SUPER_ADMIN account", async () => {
    const email = `privesc-create-${Date.now()}@example.com`;
    await expect(
      createStaffUser({
        tenantId,
        email,
        name: "Should not be created",
        role: "SUPER_ADMIN",
        password: "password123",
        actingRole: "ADMIN_RECEPTION",
      })
    ).rejects.toThrow(/only a super admin/i);

    const created = await db.user.findUnique({ where: { email } });
    expect(created).toBeNull();
  });

  it("allows a real SUPER_ADMIN to create a SUPER_ADMIN account", async () => {
    const email = `privesc-create-ok-${Date.now()}@example.com`;
    const user = await createStaffUser({
      tenantId,
      email,
      name: "Legit super admin",
      role: "SUPER_ADMIN",
      password: "password123",
      actingRole: "SUPER_ADMIN",
    });
    createdUserIds.push(user.id);
    expect(user.role).toBe("SUPER_ADMIN");
  });
});
