import { requireTenantId } from "@/lib/tenant";
import { listImagingOrders } from "@/lib/imaging";
import { createImagingOrderActionResult, cancelImagingOrderActionResult, searchPatientsAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ActionForm } from "@/components/action-form";
import { ImagingUploadForm } from "@/components/imaging-upload-form";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata = {
  title: "Imaging Orders",
};

export default async function ImagingOrdersPage() {
  const tenantId = await requireTenantId();
  const orders = await listImagingOrders(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Imaging Orders</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Order an imaging study</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createImagingOrderActionResult} className="flex flex-col gap-2">
            <Label htmlFor="patientId">Patient</Label>
            <SearchableSelect
              id="patientId"
              name="patientId"
              required
              placeholder="Search patients by name, phone, or email…"
              search={searchPatientsAction}
            />
            <Label htmlFor="modality">Modality</Label>
            <NativeSelect id="modality" name="modality" defaultValue="" required>
              <option value="" disabled>
                — choose —
              </option>
              <option value="XRAY">X-Ray</option>
              <option value="CT">CT</option>
              <option value="MRI">MRI</option>
              <option value="ULTRASOUND">Ultrasound</option>
            </NativeSelect>
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" placeholder="e.g. Lumbar spine, r/o fracture" />
            <label className="flex items-center gap-2 text-sm font-normal">
              <input type="checkbox" name="patientConsented" value="true" required className="size-4" />
              Patient has consented to this study
            </label>
            <Button type="submit" className="mt-2">
              Create order
            </Button>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imaging orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Studies</TableHead>
                  <TableHead>Upload files</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.patient.user.name}</TableCell>
                    <TableCell>{o.modality}</TableCell>
                    <TableCell>{o.description ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "COMPLETED" ? "default" : o.status === "CANCELLED" ? "destructive" : "outline"}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{o.orderedAt.toLocaleString()}</TableCell>
                    <TableCell>
                      {o.studies.length === 0
                        ? "—"
                        : o.studies.map((s) => (
                            <Link
                              key={s.id}
                              href={`/admin/patients/${o.patientId}/imaging/${s.id}`}
                              className="block text-primary hover:underline"
                            >
                              View study ({s.series.reduce((sum, se) => sum + se.instances.length, 0)} images)
                            </Link>
                          ))}
                    </TableCell>
                    <TableCell>
                      {o.status !== "CANCELLED" && <ImagingUploadForm imagingOrderId={o.id} />}
                    </TableCell>
                    <TableCell>
                      {o.status !== "CANCELLED" && (
                        <ActionForm action={cancelImagingOrderActionResult}>
                          <input type="hidden" name="imagingOrderId" value={o.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Cancel
                          </Button>
                        </ActionForm>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
