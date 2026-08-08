import { requireTenantId } from "@/lib/tenant";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { listKnowledgeBaseDocuments } from "@/lib/knowledgeBase";
import { addKnowledgeBaseDocumentActionResult, removeKnowledgeBaseDocumentActionResult } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";

export const metadata = {
  title: "Knowledge Base",
};

export default async function KnowledgeBasePage() {
  const tenantId = await requireTenantId();
  const docs = await listKnowledgeBaseDocuments(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Knowledge Base</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add document</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={addKnowledgeBaseDocumentActionResult} className="flex flex-col gap-2">
            <Label htmlFor="title">Document title</Label>
            <Input id="title" name="title" placeholder="Document title" required />
            <Label htmlFor="fileUrl">File URL</Label>
            <Input id="fileUrl" name="fileUrl" type="url" placeholder="File URL" required />
            <Button type="submit" className="mt-2 self-start">
              Add document
            </Button>
          </ActionForm>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Documents ({docs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <EmptyState icon={FileText} message={<>No documents yet.</>} />
          ) : (
            <ul className="flex flex-col gap-2">
              {docs.map((doc) => (
                <li key={doc.id} className="flex items-center gap-2">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {doc.title}
                  </a>
                  <ActionForm
                    action={removeKnowledgeBaseDocumentActionResult}
                    confirmMessage={`Delete "${doc.title}"? This cannot be undone.`}
                  >
                    <input type="hidden" name="docId" value={doc.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Delete
                    </Button>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
