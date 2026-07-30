import { db } from "@/lib/db";

export type PatientStatus =
  | "payment_pending"
  | "payment_collected"
  | "appointment_booked"
  | "follow_up"
  | "new";

export function patientDisplayId(patientId: string) {
  return patientId.slice(-6).toUpperCase();
}

export async function listDoctorsForFilter(tenantId: string) {
  return db.doctor.findMany({ where: { tenantId }, include: { user: true }, orderBy: { user: { name: "asc" } } });
}

export async function listPatients(
  tenantId: string,
  filters?: {
    search?: string;
    sort?: "newest" | "oldest";
    doctorId?: string;
    status?: PatientStatus;
  }
) {
  const patients = await db.patient.findMany({
    where: {
      tenantId,
      ...(filters?.search && {
        OR: [
          { user: { name: { contains: filters.search, mode: "insensitive" } } },
          { user: { email: { contains: filters.search, mode: "insensitive" } } },
          { user: { phone: { contains: filters.search, mode: "insensitive" } } },
          { id: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      user: true,
      appointments: {
        include: { doctor: { include: { user: true } }, followUp: true },
        orderBy: { datetime: "desc" },
      },
      invoices: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { user: { updatedAt: filters?.sort === "oldest" ? "asc" : "desc" } },
  });

  const withDerived = patients.map((p) => {
    const latestAppointment = p.appointments[0];
    const lastConsultation = p.appointments.find((a) => a.status === "COMPLETED") ?? null;
    const pendingInvoice = p.invoices.find((i) => i.status === "UNPAID" || i.status === "PARTIALLY_PAID");
    const paidInvoice = p.invoices.find((i) => i.status === "PAID");
    const pendingFollowUp = p.appointments.find((a) => a.followUp && a.followUp.status === "pending");

    let status: PatientStatus = "new";
    if (pendingInvoice) status = "payment_pending";
    else if (paidInvoice) status = "payment_collected";
    else if (latestAppointment?.status === "BOOKED") status = "appointment_booked";
    else if (pendingFollowUp) status = "follow_up";

    return {
      ...p,
      displayId: patientDisplayId(p.id),
      status,
      lastConsultation,
      latestAppointment,
    };
  });

  return withDerived.filter((p) => {
    if (filters?.status && p.status !== filters.status) return false;
    if (filters?.doctorId && p.latestAppointment?.doctorId !== filters.doctorId) return false;
    return true;
  });
}

export async function getPatientWithHistory(patientId: string, tenantId: string) {
  return db.patient.findFirst({
    where: { id: patientId, tenantId },
    include: {
      user: true,
      appointments: {
        include: {
          doctor: { include: { user: true } },
          visitRecord: true,
          invoices: true,
        },
        orderBy: { datetime: "desc" },
      },
      vitals: {
        orderBy: { recordedAt: "desc" },
      },
    },
  });
}
