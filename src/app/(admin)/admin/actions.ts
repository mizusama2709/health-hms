"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { createAppointment } from "@/lib/appointments";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN_RECEPTION" && role !== "SUPER_ADMIN") throw new Error("Not authorized");
}

export async function bookWalkIn(formData: FormData) {
  await requireAdmin();
  const tenantId = await requireTenantId();
  const doctorId = formData.get("doctorId") as string;
  const patientEmail = formData.get("patientEmail") as string;
  const datetime = formData.get("datetime") as string;

  const patient = await db.patient.findFirst({
    where: { tenantId, user: { email: patientEmail } },
  });
  if (!patient) throw new Error(`No patient found in this hospital with email ${patientEmail}`);

  await createAppointment({
    tenantId,
    doctorId,
    patientId: patient.id,
    datetime: new Date(datetime),
  });

  revalidatePath("/admin");
}

export async function addDoctor(formData: FormData) {
  await requireAdmin();
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const specialty = formData.get("specialty") as string;
  const password = formData.get("password") as string;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error(`A user with email ${email} already exists`);

  const passwordHash = await bcrypt.hash(password, 10);

  await db.user.create({
    data: {
      email,
      name,
      role: "DOCTOR",
      passwordHash,
      tenantId,
      doctor: { create: { tenantId, specialty } },
    },
  });

  revalidatePath("/admin");
}
