import Link from "next/link";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requireTenantId } from "@/lib/tenant";
import { listRxTemplatesPaged } from "@/lib/rxTemplates";
import { createRxTemplateActionResult, searchMedicinesAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ActionForm } from "@/components/action-form";
import { RxTemplateItemRows } from "@/components/rx-template-item-rows";

export const metadata = {
  title: "Rx Templates",
};

export default async function RxTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { templates, total, totalPages } = await listRxTemplatesPaged(tenantId, { page, pageSize: 50 });

  function pageHref(p: number) {
    return `/admin/pharmacy/rx-templates?page=${p}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Rx Templates</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Create template</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createRxTemplateActionResult} className="flex flex-col gap-2">
            <Label htmlFor="name">Template name</Label>
            <Input id="name" name="name" placeholder="e.g. Malaria Protocol" required />
            <Label htmlFor="diseaseTag">Disease tag</Label>
            <Input id="diseaseTag" name="diseaseTag" placeholder="e.g. Malaria" required />
            <RxTemplateItemRows search={searchMedicinesAction} />
            <Button type="submit" className="mt-2">
              Save template
            </Button>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates ({total})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {templates.length === 0 ? (
            <EmptyState icon={FileText} message={<>No templates yet.</>} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Disease tag</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.diseaseTag}</TableCell>
                      <TableCell>
                        {t.items.map((i) => `${i.medicine.name} x${i.quantity}`).join(", ")}
                      </TableCell>
                      <TableCell>{t.createdAt.toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link href={pageHref(page - 1)} className="font-medium text-primary hover:underline">
                        ← Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link href={pageHref(page + 1)} className="font-medium text-primary hover:underline">
                        Next →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
