import { requireTenantId } from "@/lib/tenant";
import { listLabOrders } from "@/lib/lab";
import { attachLabReportAction } from "../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

export default async function UploadLabReportPage() {
  const tenantId = await requireTenantId();
  const orders = await listLabOrders(tenantId);
  const approvedOrders = orders.filter((o) => o.approvedAt);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Upload Report</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Attach a report to an order</CardTitle>
        </CardHeader>
        <CardContent>
          {approvedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No approved lab orders yet — an order must be marked Completed and approved on the Lab Orders page before its report can be attached.
            </p>
          ) : (
            <form action={attachLabReportAction} className="flex flex-col gap-2">
              <Label htmlFor="labOrderId">Lab order</Label>
              <NativeSelect id="labOrderId" name="labOrderId" required>
                {approvedOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.patient.user.name} — {o.items.map((i) => i.labTest.name).join(", ")} ({o.status})
                  </option>
                ))}
              </NativeSelect>
              <Label htmlFor="fileUrl">File URL</Label>
              <Input id="fileUrl" name="fileUrl" type="url" placeholder="https://…" required />
              <Button type="submit" className="mt-2">
                Attach report
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {orders.some((o) => o.reports.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Recently attached</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {orders
              .flatMap((o) => o.reports.map((r) => ({ ...r, patientName: o.patient.user.name })))
              .map((r) => (
                <div key={r.id} className="text-sm">
                  <a href={r.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                    {r.patientName}
                  </a>{" "}
                  — {r.uploadedAt.toLocaleString()}
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
