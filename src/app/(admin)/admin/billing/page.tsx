import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { listPatients } from "@/lib/patients";
import { listServices } from "@/lib/services";
import { db } from "@/lib/db";
import { billPatientActionResult } from "./actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ActionForm } from "@/components/action-form";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Bill Patient",
};

export default async function BillPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; patientId?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;

  const matches = params.search ? await listPatients(tenantId, { search: params.search }) : [];

  const selectedPatient = params.patientId
    ? await db.patient.findFirst({ where: { id: params.patientId, tenantId }, include: { user: true } })
    : null;

  const services = selectedPatient ? await listServices(tenantId, { isActive: true }) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Bill Patient</h1>
        <p className="text-sm text-muted-foreground">Bill a patient across consultation, pharmacy &amp; lab — one screen.</p>
      </div>

      <Card className="max-w-xl">
        <CardContent className="flex flex-col gap-3 pt-6">
          <form method="get" className="flex flex-col gap-1">
            <Label htmlFor="search">Patient</Label>
            <Input id="search" name="search" placeholder="Search patient by name, phone, or Patient ID..." defaultValue={params.search ?? ""} />
          </form>

          {matches.length > 0 && (
            <div className="flex flex-col divide-y rounded-lg border">
              {matches.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/billing?search=${encodeURIComponent(params.search ?? "")}&patientId=${p.id}`}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50",
                    p.id === params.patientId && "bg-muted/50"
                  )}
                >
                  <span className="font-medium">{p.user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.displayId} {p.user.phone ? `· ${p.user.phone}` : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {params.search && matches.length === 0 && (
            <p className="text-sm text-muted-foreground">No patients match &quot;{params.search}&quot;.</p>
          )}
        </CardContent>
      </Card>

      {selectedPatient && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Bill {selectedPatient.user.name}</CardTitle>
            <CardDescription>
              {selectedPatient.user.phone ?? selectedPatient.user.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={billPatientActionResult} className="flex flex-col gap-2">
              <input type="hidden" name="patientId" value={selectedPatient.id} />
              <Label htmlFor="serviceType">Service type</Label>
              <NativeSelect id="serviceType" name="serviceType" required>
                <option value="CONSULTATION">Consultation</option>
                <option value="LAB">Lab</option>
                <option value="PHARMACY">Pharmacy</option>
              </NativeSelect>
              {services.length > 0 && (
                <>
                  <Label htmlFor="serviceId">Catalog service (optional)</Label>
                  <NativeSelect id="serviceId" name="serviceId" defaultValue="">
                    <option value="">Custom / one-off item</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {Number(s.defaultUnitPrice).toFixed(2)} ({Number(s.taxRatePercent)}% GST)
                      </option>
                    ))}
                  </NativeSelect>
                </>
              )}
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="Description" required />
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="unitPrice">Amount</Label>
                  <Input id="unitPrice" name="unitPrice" type="number" step="0.01" placeholder="Amount" required />
                </div>
                <div className="flex w-24 flex-col gap-2">
                  <Label htmlFor="quantity">Qty</Label>
                  <Input id="quantity" name="quantity" type="number" defaultValue={1} min={1} />
                </div>
                <div className="flex w-28 flex-col gap-2">
                  <Label htmlFor="taxRatePercent">GST %</Label>
                  <Input id="taxRatePercent" name="taxRatePercent" type="number" step="0.01" placeholder="0" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                GST % is ignored when a catalog service is selected — that service&apos;s own rate applies.
              </p>
              <Button type="submit" className="mt-2">
                Create invoice
              </Button>
            </ActionForm>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
