import { PrismaClient, AppointmentStatus, PaymentMode } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createInvoice } from "../src/lib/billing";
import { recordPayment } from "../src/lib/billing";

const db = new PrismaClient();

const DOCTORS = [
  { email: "dr.mehta@demo.com", name: "Dr. Anjali Mehta", specialty: "Cardiology" },
  { email: "dr.rao@demo.com", name: "Dr. Suresh Rao", specialty: "Orthopedics" },
  { email: "dr.iyer@demo.com", name: "Dr. Priya Iyer", specialty: "Pediatrics" },
  { email: "dr.khan@demo.com", name: "Dr. Farhan Khan", specialty: "Dermatology" },
  { email: "dr.nair@demo.com", name: "Dr. Meera Nair", specialty: "General Medicine" },
];

const FIRST_NAMES = [
  "Ravi", "Sneha", "Arjun", "Divya", "Karan", "Lakshmi", "Vikram", "Anita",
  "Rahul", "Priya", "Amit", "Neha", "Sanjay", "Pooja", "Rohit", "Kavya",
  "Manoj", "Deepika", "Ajay", "Swati", "Vivek", "Nisha", "Gaurav", "Ritu",
  "Kunal", "Shreya", "Nikhil", "Meenal", "Aditya", "Preeti", "Suresh", "Anjali",
];
const LAST_NAMES = [
  "Kumar", "Reddy", "Verma", "Sharma", "Malhotra", "Pillai", "Singh", "Desai",
  "Gupta", "Nair", "Iyer", "Rao", "Patel", "Menon", "Chatterjee", "Bose",
];

function buildPatients(count: number) {
  const patients = [];
  for (let i = 0; i < count; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    patients.push({
      email: `patient${i + 1}@demo.com`,
      name: `${first} ${last}`,
      phone: `90000${String(i + 1).padStart(5, "0")}`,
    });
  }
  return patients;
}

// ~50 patients is a moderate panel for a single-location clinic/hospital demo.
const PATIENTS = buildPatients(50);

const APPT_TYPES = ["NEW", "FOLLOW_UP"] as const;
const SERVICE_FEES = [400, 500, 600, 800, 1000];

function pick<T>(arr: readonly T[], seed: number) {
  return arr[seed % arr.length];
}

// Simple seeded PRNG so re-runs are deterministic (upserts stay stable).
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const rand = mulberry32(42);

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

  // Moderate booking rate: last 60 days + next 10, ~4-7 appointments per
  // weekday, ~1-2 on weekends, skipping some days entirely (clinic closed).
  let apptCount = 0;
  let invoiceCount = 0;
  for (let dayOffset = -60; dayOffset <= 10; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const isWeekend = date.getDay() === 0;
    if (isWeekend && rand() < 0.7) continue; // mostly closed Sundays

    const slotsToday = isWeekend ? 1 + Math.floor(rand() * 2) : 4 + Math.floor(rand() * 4);

    for (let slot = 0; slot < slotsToday; slot++) {
      const doctor = pick(doctors, apptCount + doctors.length);
      const patient = pick(patients, apptCount + Math.floor(rand() * patients.length));
      const datetime = new Date(date);
      datetime.setHours(9 + slot, 15 * (apptCount % 4), 0, 0);

      let status: AppointmentStatus;
      if (dayOffset < 0) {
        const r = rand();
        status = r < 0.78 ? "COMPLETED" : r < 0.9 ? "CANCELLED" : "NO_SHOW";
      } else {
        status = "BOOKED";
      }

      const id = `demo-appt-${dayOffset}-${slot}`;
      const feeAmount = pick(SERVICE_FEES, apptCount);

      const appointment = await db.appointment.upsert({
        where: { id },
        update: {},
        create: {
          id,
          tenantId: tenant.id,
          doctorId: doctor.id,
          patientId: patient.id,
          datetime,
          status,
          type: pick(APPT_TYPES, apptCount),
          serviceType: "CONSULTATION",
          feeAmount,
          paymentMode: status === "COMPLETED" ? "CASH" : null,
        },
      });
      apptCount++;

      // Bill and mostly-pay completed visits so billing/reports have real volume.
      if (status === "COMPLETED") {
        const existingInvoice = await db.invoice.findFirst({ where: { appointmentId: appointment.id } });
        if (!existingInvoice) {
          const invoice = await createInvoice({
            tenantId: tenant.id,
            patientId: patient.id,
            appointmentId: appointment.id,
            serviceType: "CONSULTATION",
            lineItems: [
              { description: "Consultation", serviceType: "CONSULTATION", quantity: 1, unitPrice: feeAmount, taxRatePercent: 18 },
            ],
          });
          invoiceCount++;
          if (rand() < 0.85) {
            const modes: PaymentMode[] = ["CASH", "UPI", "CARD"];
            await recordPayment({
              tenantId: tenant.id,
              invoiceId: invoice.id,
              amount: Number(invoice.totalAmount),
              mode: pick(modes, apptCount),
            });
          }
        }
      }
    }
  }

  console.log(
    `Seeded ${doctors.length} doctors, ${patients.length} patients, ${apptCount} appointments, ${invoiceCount} invoices.`
  );
  console.log("All accounts use password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
