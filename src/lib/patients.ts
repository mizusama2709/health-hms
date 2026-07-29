import { db } from "@/lib/db";

export async function listPatients(tenantId: string, filters?: { search?: string }) {
  return db.patient.findMany({
    where: {
      tenantId,
      ...(filters?.search && {
        user: {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      }),
    },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
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
    },
  });
}
