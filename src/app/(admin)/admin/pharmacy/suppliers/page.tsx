import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listSuppliersPaged } from "@/lib/pharmacy";
import { createSupplierActionResult, updateSupplierActionResult, toggleSupplierActiveActionResult } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/action-form";

export const metadata = {
  title: "Suppliers",
};

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { suppliers, total, totalPages } = await listSuppliersPaged(tenantId, { page, pageSize: 50 });

  function pageHref(p: number) {
    return `/admin/pharmacy/suppliers?page=${p}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Suppliers</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createSupplierActionResult} className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
            <Label htmlFor="contactPhone">Contact phone (optional)</Label>
            <Input id="contactPhone" name="contactPhone" />
            <Label htmlFor="contactEmail">Contact email (optional)</Label>
            <Input id="contactEmail" name="contactEmail" type="email" />
            <Button type="submit" className="mt-2">
              Add supplier
            </Button>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers ({total})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suppliers yet.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.contactPhone ?? "—"}</TableCell>
                      <TableCell>{s.contactEmail ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <details>
                            <summary className="cursor-pointer text-xs font-medium text-primary">Edit</summary>
                            <ActionForm action={updateSupplierActionResult} className="mt-2 flex flex-col gap-2 rounded-md border p-2">
                              <input type="hidden" name="supplierId" value={s.id} />
                              <Label htmlFor={`name-${s.id}`} className="text-xs">
                                Name
                              </Label>
                              <Input id={`name-${s.id}`} name="name" defaultValue={s.name} required className="w-48" />
                              <Label htmlFor={`phone-${s.id}`} className="text-xs">
                                Contact phone
                              </Label>
                              <Input id={`phone-${s.id}`} name="contactPhone" defaultValue={s.contactPhone ?? ""} className="w-48" />
                              <Label htmlFor={`email-${s.id}`} className="text-xs">
                                Contact email
                              </Label>
                              <Input id={`email-${s.id}`} name="contactEmail" type="email" defaultValue={s.contactEmail ?? ""} className="w-48" />
                              <Button type="submit" size="sm" variant="outline" className="self-start">
                                Save
                              </Button>
                            </ActionForm>
                          </details>
                          <ActionForm
                            action={toggleSupplierActiveActionResult}
                            confirmMessage={
                              s.isActive
                                ? `Deactivate ${s.name}? They'll no longer appear when recording new goods receipts.`
                                : undefined
                            }
                          >
                            <input type="hidden" name="supplierId" value={s.id} />
                            <input type="hidden" name="isActive" value={String(s.isActive)} />
                            <Button type="submit" size="sm" variant="outline">
                              {s.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </ActionForm>
                        </div>
                      </TableCell>
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
