import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const tenant = await db.tenant.upsert({
    where: { slug: "demo-hospital" },
    update: {},
    create: { name: "Demo Hospital", slug: "demo-hospital" },
  });

  await db.user.upsert({
    where: { email: "patient@demo.com" },
    update: {},
    create: {
      email: "patient@demo.com",
      name: "Test Patient",
      role: "PATIENT",
      passwordHash,
      tenantId: tenant.id,
      patient: { create: { tenantId: tenant.id } },
    },
  });

  await db.user.upsert({
    where: { email: "doctor@demo.com" },
    update: {},
    create: {
      email: "doctor@demo.com",
      name: "Test Doctor",
      role: "DOCTOR",
      passwordHash,
      tenantId: tenant.id,
      doctor: { create: { tenantId: tenant.id, specialty: "General Medicine" } },
    },
  });

  await db.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Test Admin",
      role: "ADMIN_RECEPTION",
      passwordHash,
      tenantId: tenant.id,
    },
  });

  console.log("Seeded: patient@demo.com / doctor@demo.com / admin@demo.com — password: password123");
}

main().finally(() => db.$disconnect());
