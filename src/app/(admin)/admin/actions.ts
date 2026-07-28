"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { createAppointment } from "@/lib/appointments";
import { db } from "@/lib/db";

export async function bookWalkIn(formData: FormData) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN_RECEPTION" && role !== "SUPER_ADMIN") throw new Error("Not authorized");

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
