"use server";

import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/lib/tenant";
import { cancelAppointment, updateAppointmentFee, updateAppointmentTiming, getAppointmentDetailed } from "@/lib/appointments";
import { createInvoice } from "@/lib/billing";
import { sendInvoiceViaWhatsApp } from "@/lib/whatsapp";

export async function cancelAppointmentAction(appointmentId: string) {
  const tenantId = await requireTenantId();
  await cancelAppointment(appointmentId, tenantId, "STAFF");
  revalidatePath("/admin/schedule/appointments");
}

export async function editAppointmentAction(formData: FormData) {
  const tenantId = await requireTenantId();
  const appointmentId = formData.get("appointmentId") as string;
  const datetime = formData.get("datetime") as string;
  const feeAmount = formData.get("feeAmount") as string;

  if (datetime) await updateAppointmentTiming(appointmentId, tenantId, new Date(datetime));
  if (feeAmount) await updateAppointmentFee(appointmentId, tenantId, Number(feeAmount));

  revalidatePath("/admin/schedule/appointments");
}

export async function sendReceiptAction(appointmentId: string) {
  const tenantId = await requireTenantId();
  const appointment = await getAppointmentDetailed(appointmentId, tenantId);
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

  await sendInvoiceViaWhatsApp({ tenantId, invoiceId, toPhone: phone });
  revalidatePath("/admin/schedule/appointments");
}
