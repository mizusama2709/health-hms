import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listMedicinesPaged } from "@/lib/pharmacy";
import { createMedicineAction, updateMedicinePriceAction, bulkUpdateMedicinePricesAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Medicines",
};

export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; unpriced?: string; page?: string; bulkResult?: string; bulkError?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const search = params.search || undefined;
  const unpriced = params.unpriced === "true";
  const page = Number(params.page) || 1;

  const [bulkMatched, bulkNotFound, bulkInvalid] = params.bulkResult?.split(",").map(Number) ?? [];
  const hasBulkResult = params.bulkResult !== undefined && [bulkMatched, bulkNotFound, bulkInvalid].every((n) => Number.isFinite(n));

  const { medicines, total, totalPages } = await listMedicinesPaged(tenantId, { search, unpriced, page, pageSize: 50 });

  function pageHref(p: number) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (unpriced) q.set("unpriced", "true");
    q.set("page", String(p));
    return `/admin/pharmacy/medicines?${q.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Medicines</h1>
        <Link href="/admin/pharmacy/medicines/batches" className="text-sm font-medium text-primary hover:underline">
          View batches &amp; expiry →
        </Link>
      </div>

      {hasBulkResult && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
          <span className="font-medium text-emerald-800 dark:text-emerald-300">
            Bulk price upload: {bulkMatched} priced
          </span>{" "}
          <span className="text-emerald-700 dark:text-emerald-400">
            {bulkNotFound > 0 && `· ${bulkNotFound} name(s) not found `}
            {bulkInvalid > 0 && `· ${bulkInvalid} row(s) skipped (invalid)`}
          </span>
        </div>
      )}
      {params.bulkError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {params.bulkError}
        </div>
      )}

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Bulk price upload</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Upload a CSV with two columns — medicine name, unit price — to price many medicines at once. Matches by
            exact name (case-insensitive); an optional header row is skipped automatically.
          </p>
          <form action={bulkUpdateMedicinePricesAction} className="flex items-end gap-2">
            <Input name="file" type="file" accept=".csv,text/csv" required className="flex-1" />
            <Button type="submit" variant="outline">
              Upload
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add medicine</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMedicineAction} className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. Paracetamol 500mg" required />
            <Label htmlFor="sku">SKU (optional)</Label>
            <Input id="sku" name="sku" />
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="unitPrice">Unit price</Label>
                <Input id="unitPrice" name="unitPrice" type="number" step="0.01" required />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="stockQuantity">Initial stock</Label>
                <Input id="stockQuantity" name="stockQuantity" type="number" defaultValue={0} />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="reorderLevel">Reorder level</Label>
                <Input id="reorderLevel" name="reorderLevel" type="number" />
              </div>
            </div>
            <Button type="submit" className="mt-2">
              Add medicine
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory ({total})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Search</span>
              <Input name="search" placeholder="Medicine name" defaultValue={search ?? ""} className="w-64" />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="unpriced" value="true" defaultChecked={unpriced} className="size-4" />
              Unpriced only
            </label>
            <Button type="submit" variant="outline">
              Apply
            </Button>
            {(search || unpriced) && (
              <Link href="/admin/pharmacy/medicines" className="text-sm text-muted-foreground hover:underline">
                Clear
              </Link>
            )}
          </form>

          {medicines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No medicines match this filter.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Reorder level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Batches</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicines.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.sku ?? "—"}</TableCell>
                      <TableCell>
                        {Number(m.unitPrice) === 0 ? (
                          <form action={updateMedicinePriceAction} className="flex items-center gap-1">
                            <input type="hidden" name="medicineId" value={m.id} />
                            <Badge variant="destructive">Unpriced</Badge>
                            <Input
                              name="unitPrice"
                              type="number"
                              step="0.01"
                              min={0}
                              placeholder="Set price"
                              className="w-24"
                              required
                            />
                            <Button type="submit" size="sm" variant="outline">
                              Save
                            </Button>
                          </form>
                        ) : (
                          Number(m.unitPrice).toFixed(2)
                        )}
                      </TableCell>
                      <TableCell>
                        {m.reorderLevel !== null && m.stockQuantity <= m.reorderLevel ? (
                          <Badge variant="destructive">{m.stockQuantity}</Badge>
                        ) : (
                          m.stockQuantity
                        )}
                      </TableCell>
                      <TableCell>{m.reorderLevel ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={m.isActive ? "default" : "secondary"}>{m.isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/pharmacy/medicines/batches?search=${encodeURIComponent(m.name)}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View →
                        </Link>
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
