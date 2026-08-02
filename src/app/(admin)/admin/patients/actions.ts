"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { createPatient, updatePatientProfile } from "@/lib/patients";
import { createLead, importLeads, updateLeadStatus, convertLeadToPatient } from "@/lib/leads";
import type { Gender, LeadStatus } from "@prisma/client";

const PATIENT_MANAGEMENT_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN", "RECEPTIONIST", "NURSE"] as const;

export async function createPatientAction(formData: FormData) {
  await requireRole(...PATIENT_MANAGEMENT_ROLES);
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const dateOfBirthRaw = formData.get("dateOfBirth") as string;
  const genderRaw = formData.get("gender") as string;

  await createPatient({
    tenantId,
    name,
    email,
    phone,
    password,
    dateOfBirth: dateOfBirthRaw ? new Date(dateOfBirthRaw) : undefined,
    gender: (genderRaw || undefined) as Gender | undefined,
  });

  revalidatePath("/admin/patients");
}

export async function updatePatientProfileAction(formData: FormData) {
  await requireRole(...PATIENT_MANAGEMENT_ROLES);
  const tenantId = await requireTenantId();

  const patientId = formData.get("patientId") as string;
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const dateOfBirthRaw = formData.get("dateOfBirth") as string;
  const genderRaw = formData.get("gender") as string;

  await updatePatientProfile(patientId, tenantId, {
    name: name || undefined,
    phone: phone || undefined,
    dateOfBirth: dateOfBirthRaw ? new Date(dateOfBirthRaw) : null,
    gender: (genderRaw || null) as Gender | null,
  });

  revalidatePath(`/admin/patients/${patientId}`);
  revalidatePath("/admin/patients");
}

export async function createLeadAction(formData: FormData) {
  await requireRole(...PATIENT_MANAGEMENT_ROLES);
  const tenantId = await requireTenantId();

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = (formData.get("email") as string) || undefined;

  await createLead({ tenantId, name, phone, email });

  revalidatePath("/admin/patients");
}

export async function importLeadsAction(formData: FormData) {
  await requireRole(...PATIENT_MANAGEMENT_ROLES);
  const tenantId = await requireTenantId();

  const raw = (formData.get("rows") as string) || "";
  const rows = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, phone, email] = line.split(",").map((part) => part.trim());
      return { name, phone, email: email || undefined };
    })
    .filter((r) => r.name && r.phone);

  await importLeads(tenantId, rows);

  revalidatePath("/admin/patients");
}

export async function updateLeadStatusAction(formData: FormData) {
  await requireRole(...PATIENT_MANAGEMENT_ROLES);
  const tenantId = await requireTenantId();

  const leadId = formData.get("leadId") as string;
  const status = formData.get("status") as LeadStatus;

  await updateLeadStatus(tenantId, leadId, status);

  revalidatePath("/admin/patients");
}

export async function convertLeadAction(formData: FormData) {
  await requireRole(...PATIENT_MANAGEMENT_ROLES);
  const tenantId = await requireTenantId();

  const leadId = formData.get("leadId") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const dateOfBirthRaw = formData.get("dateOfBirth") as string;
  const genderRaw = formData.get("gender") as string;

  await convertLeadToPatient(tenantId, leadId, {
    email,
    password,
    dateOfBirth: dateOfBirthRaw ? new Date(dateOfBirthRaw) : undefined,
    gender: (genderRaw || undefined) as Gender | undefined,
  });

  revalidatePath("/admin/patients");
}
