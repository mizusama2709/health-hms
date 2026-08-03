"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { db } from "@/lib/db";
import { createImagingOrder, uploadImagingInstances } from "@/lib/imaging";
import { searchPatients } from "@/lib/patients";
import { withActionResult } from "@/lib/actionResult";
import type { ImagingModality } from "@prisma/client";

const IMAGING_ROLES = ["LAB", "ADMIN_RECEPTION", "SUPER_ADMIN"] as const;

export async function searchPatientsAction(query: string) {
  await requireRole(...IMAGING_ROLES);
  const tenantId = await requireTenantId();
  return searchPatients(tenantId, query);
}

export async function createImagingOrderAction(formData: FormData) {
  const session = await requireRole(...IMAGING_ROLES);
  const tenantId = await requireTenantId();

  const patientId = formData.get("patientId") as string;
  const modality = formData.get("modality") as ImagingModality;
  const description = (formData.get("description") as string) || undefined;
  const patientConsented = formData.get("patientConsented") === "true";

  const patient = await db.patient.findFirst({ where: { id: patientId, tenantId } });
  if (!patient) throw new Error("Select a patient before ordering an imaging study");
  if (!modality) throw new Error("Select a modality to order");
  if (!patientConsented) throw new Error("Patient consent is required before ordering an imaging study");

  await createImagingOrder({
    tenantId,
    patientId: patient.id,
    orderedById: session.user.id,
    modality,
    description,
    patientConsentedAt: new Date(),
  });

  revalidatePath("/admin/imaging/orders");
}

export const createImagingOrderActionResult = withActionResult(createImagingOrderAction, "Imaging study ordered");

export async function uploadImagingInstancesAction(formData: FormData) {
  await requireRole(...IMAGING_ROLES);
  const tenantId = await requireTenantId();

  const imagingOrderId = formData.get("imagingOrderId") as string;
  const files = formData.getAll("files") as File[];
  const realFiles = files.filter((f) => f.size > 0);

  if (realFiles.length === 0) throw new Error("Choose at least one DICOM file to upload");

  const parsed = await Promise.all(
    realFiles.map(async (file) => ({ name: file.name, bytes: Buffer.from(await file.arrayBuffer()) }))
  );

  await uploadImagingInstances(tenantId, imagingOrderId, parsed);

  revalidatePath("/admin/imaging/orders");
}

export const uploadImagingInstancesActionResult = withActionResult(uploadImagingInstancesAction, "Files uploaded");
