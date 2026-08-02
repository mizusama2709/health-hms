import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listMedicineBatches, type BatchExpiryFilter } from "@/lib/pharmacy";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Batches & Expiry",
};

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default async function MedicineBatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; expiry?: string; page?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const search = params.search || undefined;
  const expiry = (["expired", "30d", "90d"].includes(params.expiry ?? "") ? params.expiry : "all") as BatchExpiryFilter;
  const page = Number(params.page) || 1;

  const { batches, total, totalPages } = await listMedicineBatches(tenantId, { search, expiry, page, pageSize: 50 });

  function pageHref(p: number) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (expiry !== "all") q.set("expiry", expiry);
    q.set("page", String(p));
    return `/admin/pharmacy/medicines/batches?${q.toString()}`;
  }

  function expiryBadge(days: number | null) {
    if (days === null) return null;
    if (days < 0) return <Badge variant="destructive">Expired</Badge>;
    if (days <= 30) return <Badge variant="destructive">{days}d left</Badge>;
    if (days <= 90) return <Badge variant="secondary">{days}d left</Badge>;
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/pharmacy/medicines" className="text-sm font-medium text-primary hover:underline">
          ← Back to Medicines
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Batches &amp; Expiry</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batches with stock ({total})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Search</span>
              <Input name="search" placeholder="Medicine name" defaultValue={search ?? ""} className="w-64" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Expiry</span>
              <NativeSelect name="expiry" defaultValue={expiry} className="w-48">
                <option value="all">All batches</option>
                <option value="expired">Already expired</option>
                <option value="30d">Expiring within 30 days</option>
                <option value="90d">Expiring within 90 days</option>
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>

          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No batches match this filter.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Batch no.</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Available qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.medicine.name}</TableCell>
                      <TableCell>{b.batchNo ?? "—"}</TableCell>
                      <TableCell>{b.manufacturer ?? "—"}</TableCell>
                      <TableCell>{formatDate(b.receivedDate)}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        {formatDate(b.expiryDate)}
                        {expiryBadge(b.daysUntilExpiry)}
                      </TableCell>
                      <TableCell>{b.availableQty}</TableCell>
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
