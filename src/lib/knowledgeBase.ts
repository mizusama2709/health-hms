import { db } from "@/lib/db";

export async function listKnowledgeBaseDocuments(tenantId: string) {
  return db.knowledgeBaseDocument.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function uploadKnowledgeBaseDocument(params: {
  tenantId: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  uploadedById?: string;
}) {
  return db.knowledgeBaseDocument.create({
    data: {
      tenantId: params.tenantId,
      title: params.title,
      fileUrl: params.fileUrl,
      fileType: params.fileType,
      uploadedById: params.uploadedById,
    },
  });
}

export async function deleteKnowledgeBaseDocument(tenantId: string, docId: string) {
  return db.knowledgeBaseDocument.deleteMany({ where: { id: docId, tenantId } });
}
