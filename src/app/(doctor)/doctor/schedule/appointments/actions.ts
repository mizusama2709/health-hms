"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancelAppointment, updateAppointmentFee, updateAppointmentTiming, getAppointmentDetailed } from "@/lib/appointments";
import { createInvoice } from "@/lib/billing";
import { sendInvoiceViaWhatsApp } from "@/lib/whatsapp";
import { withActionResult } from "@/lib/actionResult";
import { getBaseUrl } from "@/lib/baseUrl";

async function requireDoctorContext() {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const userId = session?.user?.id;
  if (!tenantId || !userId) throw new Error("Not authorized");
  const doctor = await db.doctor.findUnique({ where: { userId } });
  if (!doctor) throw new Error("Not authorized");
  return { tenantId, doctorId: doctor.id };
}

export async function cancelAppointmentAction(formData: FormData) {
  const { tenantId, doctorId } = await requireDoctorContext();
  const appointmentId = formData.get("appointmentId") as string;
  await cancelAppointment(appointmentId, tenantId, "DOCTOR", doctorId);
  revalidatePath("/doctor/schedule/appointments");
}

export const cancelAppointmentActionResult = withActionResult(cancelAppointmentAction, "Appointment cancelled");

export async function editAppointmentAction(formData: FormData) {
  const { tenantId, doctorId } = await requireDoctorContext();
  const appointmentId = formData.get("appointmentId") as string;
  const datetime = formData.get("datetime") as string;
  const feeAmount = formData.get("feeAmount") as string;

  if (datetime) await updateAppointmentTiming(appointmentId, tenantId, new Date(datetime), doctorId);
  if (feeAmount) await updateAppointmentFee(appointmentId, tenantId, Number(feeAmount), doctorId);

  revalidatePath("/doctor/schedule/appointments");
}

export const editAppointmentActionResult = withActionResult(editAppointmentAction, "Appointment updated");

export async function sendReceiptAction(appointmentId: string) {
  const { tenantId, doctorId } = await requireDoctorContext();
  const appointment = await getAppointmentDetailed(appointmentId, tenantId, doctorId);
  if (!appointment) throw new Error("Appointment not found");

  const phone = appointment.patient.user.phone;
  if (!phone) throw new Error("Patient has no phone number on file");

  let invoiceId = appointment.invoices[0]?.id;
  if (!invoiceId) {
    const invoice = await createInvoice({
      tenantId,
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      serviceType: appointment.serviceType,
      lineItems: [
        {
          description: `${appointment.serviceType} — ${appointment.type}`,
          serviceType: appointment.serviceType,
          quantity: 1,
          unitPrice: Number(appointment.feeAmount ?? 0),
        },
      ],
    });
    invoiceId = invoice.id;
  }

  await sendInvoiceViaWhatsApp({ tenantId, invoiceId, toPhone: phone, baseUrl: await getBaseUrl() });
  revalidatePath("/doctor/schedule/appointments");
}
