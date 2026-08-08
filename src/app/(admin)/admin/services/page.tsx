import Link from "next/link";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requireTenantId } from "@/lib/tenant";
import { listServicesPaged } from "@/lib/services";
import { createServiceActionResult, toggleServiceActiveActionResult, bulkSetServicesActiveActionResult } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ActionForm } from "@/components/action-form";
import { ServicesTable } from "@/components/services-table";

export const metadata = {
  title: "Services",
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { services, total, totalPages } = await listServicesPaged(tenantId, { page, pageSize: 50 });

  function pageHref(p: number) {
    return `/admin/services?page=${p}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Services</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add service</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createServiceActionResult} className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. General Consultation" required />
            <Label htmlFor="serviceType">Type</Label>
            <NativeSelect id="serviceType" name="serviceType" required>
              <option value="CONSULTATION">Consultation</option>
              <option value="LAB">Lab</option>
              <option value="PHARMACY">Pharmacy</option>
            </NativeSelect>
            <Label htmlFor="defaultUnitPrice">Default price</Label>
            <Input id="defaultUnitPrice" name="defaultUnitPrice" type="number" step="0.01" required />
            <Label htmlFor="taxRatePercent">GST rate (%)</Label>
            <Input id="taxRatePercent" name="taxRatePercent" type="number" step="0.01" defaultValue={0} placeholder="e.g. 18" />
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" />
            <Button type="submit" className="mt-2">
              Add service
            </Button>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalog ({total})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {services.length === 0 ? (
            <EmptyState icon={FileText} message={<>No services yet.</>} />
          ) : (
            <>
              <ServicesTable
                services={services.map((s) => ({
                  ...s,
                  defaultUnitPrice: Number(s.defaultUnitPrice),
                  taxRatePercent: Number(s.taxRatePercent),
                }))}
                toggleAction={toggleServiceActiveActionResult}
                bulkAction={bulkSetServicesActiveActionResult}
              />

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
