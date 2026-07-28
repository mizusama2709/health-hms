"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { requireTenantId } from "@/lib/tenant";
import { uploadKnowledgeBaseDocument, deleteKnowledgeBaseDocument } from "@/lib/knowledgeBase";

const SETTINGS_ROLES = ["ADMIN_RECEPTION", "SUPER_ADMIN"] as const;

export async function addKnowledgeBaseDocument(formData: FormData) {
  await requireRole(...SETTINGS_ROLES);
  const tenantId = await requireTenantId();

  const title = formData.get("title") as string;
  const fileUrl = formData.get("fileUrl") as string;

  await uploadKnowledgeBaseDocument({ tenantId, title, fileUrl });

  revalidatePath("/admin/knowledge-base");
}

export async function removeKnowledgeBaseDocument(formData: FormData) {
  await requireRole(...SETTINGS_ROLES);
  const tenantId = await requireTenantId();

  const docId = formData.get("docId") as string;
  await deleteKnowledgeBaseDocument(tenantId, docId);

  revalidatePath("/admin/knowledge-base");
}
