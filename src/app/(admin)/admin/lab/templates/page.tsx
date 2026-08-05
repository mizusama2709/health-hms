import { requireTenantId } from "@/lib/tenant";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { listLabReportTemplates } from "@/lib/lab";
import { createLabReportTemplateAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Lab Report Templates",
};

export default async function LabReportTemplatesPage() {
  const tenantId = await requireTenantId();
  const templates = await listLabReportTemplates(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Report Templates</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add template</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLabReportTemplateAction} className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. CBC Report" required />
            <Label htmlFor="body">Template body</Label>
            <Textarea id="body" name="body" rows={6} required />
            <Button type="submit" className="mt-2">
              Add template
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {templates.length === 0 ? (
            <EmptyState icon={FileText} message={<>No templates yet.</>} />
          ) : (
            templates.map((t) => (
              <div key={t.id} className="rounded-lg border p-3">
                <div className="font-medium">{t.name}</div>
                <pre className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</pre>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
