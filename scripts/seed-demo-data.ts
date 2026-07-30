import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DOCTORS = [
  { email: "dr.mehta@demo.com", name: "Dr. Anjali Mehta", specialty: "Cardiology" },
  { email: "dr.rao@demo.com", name: "Dr. Suresh Rao", specialty: "Orthopedics" },
  { email: "dr.iyer@demo.com", name: "Dr. Priya Iyer", specialty: "Pediatrics" },
  { email: "dr.khan@demo.com", name: "Dr. Farhan Khan", specialty: "Dermatology" },
  { email: "dr.nair@demo.com", name: "Dr. Meera Nair", specialty: "General Medicine" },
];

const PATIENTS = [
  { email: "patient1@demo.com", name: "Ravi Kumar", phone: "9000000001" },
  { email: "patient2@demo.com", name: "Sneha Reddy", phone: "9000000002" },
  { email: "patient3@demo.com", name: "Arjun Verma", phone: "9000000003" },
  { email: "patient4@demo.com", name: "Divya Sharma", phone: "9000000004" },
  { email: "patient5@demo.com", name: "Karan Malhotra", phone: "9000000005" },
  { email: "patient6@demo.com", name: "Lakshmi Pillai", phone: "9000000006" },
  { email: "patient7@demo.com", name: "Vikram Singh", phone: "9000000007" },
  { email: "patient8@demo.com", name: "Anita Desai", phone: "9000000008" },
];

const APPT_TYPES = ["NEW", "FOLLOW_UP"] as const;
const APPT_STATUSES = ["BOOKED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

function pick<T>(arr: readonly T[], i: number) {
  return arr[i % arr.length];
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const tenant = await db.tenant.upsert({
    where: { slug: "demo-hospital" },
    update: {},
    create: { name: "Demo Hospital", slug: "demo-hospital" },
  });

  const doctors = [];
  for (const d of DOCTORS) {
    const user = await db.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        name: d.name,
        role: "DOCTOR",
        passwordHash,
        tenantId: tenant.id,
        doctor: { create: { tenantId: tenant.id, specialty: d.specialty } },
      },
      include: { doctor: true },
    });
    doctors.push(user.doctor!);
  }

  const patients = [];
  for (const p of PATIENTS) {
    const user = await db.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        name: p.name,
        phone: p.phone,
        role: "PATIENT",
        passwordHash,
        tenantId: tenant.id,
        patient: { create: { tenantId: tenant.id } },
      },
      include: { patient: true },
    });
    patients.push(user.patient!);
  }

  // Spread appointments across today +/- 3 days, business hours 9am-5pm
  let count = 0;
  for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
    const slotsToday = 3 + (dayOffset % 2 === 0 ? 1 : 0);
    for (let slot = 0; slot < slotsToday; slot++) {
      const doctor = pick(doctors, count);
      const patient = pick(patients, count + slot);
      const datetime = new Date();
      datetime.setHours(9 + slot * 2, 0, 0, 0);
      datetime.setDate(datetime.getDate() + dayOffset);

      const status = dayOffset < 0 ? pick(APPT_STATUSES, count) : "BOOKED";
      const id = `demo-appt-${dayOffset}-${slot}`;

      await db.appointment.upsert({
        where: { id },
        update: {},
        create: {
          id,
          tenantId: tenant.id,
          doctorId: doctor.id,
          patientId: patient.id,
          datetime,
          status,
          type: pick(APPT_TYPES, count),
          serviceType: "CONSULTATION",
          feeAmount: 400 + (count % 5) * 100,
          paymentMode: status === "COMPLETED" ? "CASH" : null,
        },
      });
      count++;
    }
  }

  console.log(`Seeded ${doctors.length} doctors, ${patients.length} patients, ${count} appointments.`);
  console.log("All accounts use password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
