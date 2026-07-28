import { requireTenantId } from "@/lib/tenant";
import { listKnowledgeBaseDocuments } from "@/lib/knowledgeBase";
import { addKnowledgeBaseDocument, removeKnowledgeBaseDocument } from "./actions";

export default async function KnowledgeBasePage() {
  const tenantId = await requireTenantId();
  const docs = await listKnowledgeBaseDocuments(tenantId);

  return (
    <main style={{ maxWidth: 600, margin: "40px auto" }}>
      <h1>Knowledge Base</h1>

      <form action={addKnowledgeBaseDocument} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
        <input name="title" placeholder="Document title" required />
        <input name="fileUrl" type="url" placeholder="File URL" required />
        <button type="submit">Add document</button>
      </form>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 24 }}>
        {docs.map((doc) => (
          <li key={doc.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <a href={doc.fileUrl} target="_blank" rel="noreferrer">
              {doc.title}
            </a>
            <form action={removeKnowledgeBaseDocument}>
              <input type="hidden" name="docId" value={doc.id} />
              <button type="submit">Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
