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

  const patientUser = await db.user.findUniqueOrThrow({
    where: { email: "patient@demo.com" },
    include: { patient: true },
  });
  const doctorUser = await db.user.findUniqueOrThrow({
    where: { email: "doctor@demo.com" },
    include: { doctor: true },
  });

  const appointment = await db.appointment.upsert({
    where: { id: "seed-appointment-1" },
    update: {},
    create: {
      id: "seed-appointment-1",
      tenantId: tenant.id,
      doctorId: doctorUser.doctor!.id,
      patientId: patientUser.patient!.id,
      datetime: new Date(),
      status: "COMPLETED",
      serviceType: "CONSULTATION",
      feeAmount: 500,
      paymentMode: "CASH",
    },
  });

  const invoice = await db.invoice.upsert({
    where: { invoiceNumber: "INV-SEED-0001" },
    update: {},
    create: {
      tenantId: tenant.id,
      patientId: patientUser.patient!.id,
      appointmentId: appointment.id,
      invoiceNumber: "INV-SEED-0001",
      serviceType: "CONSULTATION",
      subtotal: 500,
      totalAmount: 500,
      amountPaid: 500,
      status: "PAID",
      lineItems: {
        create: [
          {
            description: "General Consultation",
            serviceType: "CONSULTATION",
            quantity: 1,
            unitPrice: 500,
            lineTotal: 500,
          },
        ],
      },
    },
  });

  await db.payment.upsert({
    where: { id: "seed-payment-1" },
    update: {},
    create: {
      id: "seed-payment-1",
      tenantId: tenant.id,
      invoiceId: invoice.id,
      amount: 500,
      mode: "CASH",
      status: "SUCCESS",
    },
  });

  console.log("Seeded: patient@demo.com / doctor@demo.com / admin@demo.com — password: password123");
}

main().finally(() => db.$disconnect());
