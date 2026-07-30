import { requireTenantId } from "@/lib/tenant";
import { listLabOrders } from "@/lib/lab";
import { attachLabReportAction, sendLabReportWhatsAppAction } from "../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

export default async function UploadLabReportPage() {
  const tenantId = await requireTenantId();
  const orders = await listLabOrders(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Upload Report</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Attach a report to an order</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lab orders yet — create one first.</p>
          ) : (
            <form action={attachLabReportAction} className="flex flex-col gap-2">
              <Label htmlFor="labOrderId">Lab order</Label>
              <NativeSelect id="labOrderId" name="labOrderId" required>
                {orders.map((o) => (
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
          <CardContent className="flex flex-col gap-3">
            {orders
              .flatMap((o) =>
                o.reports.map((r) => ({ ...r, patientName: o.patient.user.name, patientPhone: o.patient.user.phone }))
              )
              .map((r) => (
                <div key={r.id} className="flex flex-col gap-2 rounded-md border p-2 text-sm">
                  <div>
                    <a href={r.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                      {r.patientName}
                    </a>{" "}
                    — {r.uploadedAt.toLocaleString()}
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <form action={sendLabReportWhatsAppAction} className="flex items-end gap-2">
                      <input type="hidden" name="labReportId" value={r.id} />
                      <input type="hidden" name="toPhone" value={r.patientPhone ?? ""} />
                      <Button type="submit" size="sm" variant="outline" disabled={!r.patientPhone}>
                        Send to patient{r.patientPhone ? ` (${r.patientPhone})` : " (no phone on file)"}
                      </Button>
                    </form>
                    <form action={sendLabReportWhatsAppAction} className="flex items-end gap-2">
                      <input type="hidden" name="labReportId" value={r.id} />
                      <Input name="toPhone" placeholder="Lab staff phone" className="w-40" required />
                      <Button type="submit" size="sm" variant="outline">
                        Send to lab staff
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
