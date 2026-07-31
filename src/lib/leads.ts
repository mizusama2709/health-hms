import { db } from "@/lib/db";
import { createPatient } from "@/lib/patients";
import type { LeadStatus, LeadSource, Gender } from "@prisma/client";

export async function listLeads(tenantId: string, filters?: { search?: string; status?: LeadStatus }) {
  return db.lead.findMany({
    where: {
      tenantId,
      ...(filters?.status ? { status: filters.status } : { status: { not: "CONVERTED" } }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { phone: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createLead(params: {
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  source?: LeadSource;
}) {
  return db.lead.create({
    data: {
      tenantId: params.tenantId,
      name: params.name,
      phone: params.phone,
      email: params.email,
      source: params.source ?? "MANUAL",
    },
  });
}

export async function importLeads(tenantId: string, rows: { name: string; phone: string; email?: string }[]) {
  if (rows.length === 0) return { count: 0 };
  return db.lead.createMany({
    data: rows.map((r) => ({
      tenantId,
      name: r.name,
      phone: r.phone,
      email: r.email,
      source: "IMPORT" as LeadSource,
    })),
  });
}

export async function updateLeadStatus(tenantId: string, leadId: string, status: LeadStatus) {
  return db.lead.updateMany({ where: { id: leadId, tenantId }, data: { status } });
}

export async function convertLeadToPatient(
  tenantId: string,
  leadId: string,
  params: { email: string; password: string; dateOfBirth?: Date; gender?: Gender }
) {
  const lead = await db.lead.findFirst({ where: { id: leadId, tenantId } });
  if (!lead) throw new Error("Lead not found");
  if (lead.status === "CONVERTED") throw new Error("Lead has already been converted");

  const user = await createPatient({
    tenantId,
    name: lead.name,
    email: params.email,
    phone: lead.phone,
    password: params.password,
    dateOfBirth: params.dateOfBirth,
    gender: params.gender,
  });

  await db.lead.update({
    where: { id: leadId },
    data: { status: "CONVERTED", convertedPatientId: user.patient!.id },
  });

  return user;
}
