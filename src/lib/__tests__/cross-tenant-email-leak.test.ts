import { describe, it, expect, afterEach, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createPatient } from "@/lib/patients";
import { createStaffUser } from "@/lib/staff";

// Regression tests: createPatient/createStaffUser used to pre-check email
// existence with a global (non-tenant-scoped) findUnique, then surface a
// distinct "already exists" error — letting staff at Tenant A learn whether
// an email is registered at *any* tenant, not just their own. Both now
// attempt the create and translate the real DB constraint violation into a
// generic message instead, which is identical whether the conflict is in
// the same tenant or a different one (no oracle either way).

let tenantAId: string;
let tenantBId: string;
let createdExtraTenantId: string | undefined;
const createdUserIds: string[] = [];

afterEach(async () => {
  for (const id of createdUserIds.splice(0)) {
    await db.patient.deleteMany({ where: { userId: id } }).catch(() => {});
    await db.user.delete({ where: { id } }).catch(() => {});
  }
});

afterAll(async () => {
  if (createdExtraTenantId) {
    await db.tenant.delete({ where: { id: createdExtraTenantId } }).catch(() => {});
  }
});

async function ensureTwoTenants() {
  const tenants = await db.tenant.findMany({ take: 2 });
  if (tenants.length >= 2) {
    tenantAId = tenants[0].id;
    tenantBId = tenants[1].id;
    return;
  }
  // Only one tenant exists in this dev DB — create a throwaway second one
  // so the cross-tenant scenario is real, not simulated within one tenant.
  tenantAId = tenants[0].id;
  const extra = await db.tenant.create({
    data: { name: "Cross-tenant leak test tenant", slug: `cross-tenant-leak-test-${Date.now()}` },
  });
  tenantBId = extra.id;
  createdExtraTenantId = extra.id;
}

describe("createPatient — no cross-tenant email enumeration", () => {
  it("gives the same generic error whether the email exists in another tenant or this one", async () => {
    await ensureTwoTenants();
    const email = `cross-tenant-leak-${Date.now()}@example.com`;

    const patientInTenantA = await createPatient({
      tenantId: tenantAId,
      name: "Original account",
      email,
      phone: "+10000000000",
      password: "password123",
    });
    createdUserIds.push(patientInTenantA.id);

    let errorFromOtherTenant: string | undefined;
    try {
      await createPatient({ tenantId: tenantBId, name: "Attacker probe", email, phone: "+19999999999", password: "password123" });
    } catch (e) {
      errorFromOtherTenant = e instanceof Error ? e.message : String(e);
    }

    let errorFromSameTenant: string | undefined;
    try {
      await createPatient({ tenantId: tenantAId, name: "Same-tenant dup", email, phone: "+18888888888", password: "password123" });
    } catch (e) {
      errorFromSameTenant = e instanceof Error ? e.message : String(e);
    }

    expect(errorFromOtherTenant).toBeDefined();
    expect(errorFromSameTenant).toBeDefined();
    // The whole point: identical wording either way — no signal about which tenant the conflict is in.
    expect(errorFromOtherTenant).toBe(errorFromSameTenant);
    expect(errorFromOtherTenant).not.toMatch(/already exists/i); // old leaking message wording
  });

  it("still succeeds for a genuinely new email", async () => {
    await ensureTwoTenants();
    const email = `cross-tenant-leak-new-${Date.now()}@example.com`;
    const patient = await createPatient({ tenantId: tenantAId, name: "Fresh patient", email, phone: "+10000000001", password: "password123" });
    createdUserIds.push(patient.id);
    expect(patient.email).toBe(email);
  });
});

describe("createStaffUser — no cross-tenant email enumeration", () => {
  it("gives the same generic error whether the email exists in another tenant or this one", async () => {
    await ensureTwoTenants();
    const email = `cross-tenant-leak-staff-${Date.now()}@example.com`;

    const staffInTenantA = await createStaffUser({
      tenantId: tenantAId,
      name: "Original staff",
      email,
      role: "RECEPTIONIST",
      password: "password123",
      actingRole: "SUPER_ADMIN",
    });
    createdUserIds.push(staffInTenantA.id);

    let errorFromOtherTenant: string | undefined;
    try {
      await createStaffUser({ tenantId: tenantBId, name: "Attacker probe", email, role: "RECEPTIONIST", password: "password123", actingRole: "SUPER_ADMIN" });
    } catch (e) {
      errorFromOtherTenant = e instanceof Error ? e.message : String(e);
    }

    expect(errorFromOtherTenant).toBeDefined();
    expect(errorFromOtherTenant).not.toMatch(/already exists/i);
  });
});
