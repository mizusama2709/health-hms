"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { updateAppointmentStatus } from "@/lib/appointments";
import { AppointmentStatus } from "@prisma/client";

export async function setAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
  const session = await auth();
  if (session?.user?.role !== "DOCTOR") throw new Error("Not authorized");

  const tenantId = await requireTenantId();
  await updateAppointmentStatus(appointmentId, tenantId, status);
  revalidatePath("/doctor");
}
