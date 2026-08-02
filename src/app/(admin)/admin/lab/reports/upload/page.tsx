import { requireTenantId } from "@/lib/tenant";
import { listLabOrders } from "@/lib/lab";
import { sendLabReportWhatsAppAction } from "../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Lab Reports",
};

export default async function LabReportsPage() {
  const tenantId = await requireTenantId();
  const orders = await listLabOrders(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Lab Reports</h1>
      <p className="text-sm text-muted-foreground">
        A report PDF is generated automatically — from the results already entered — and sent to the patient&apos;s
        phone via WhatsApp the moment a lab order is approved on the Lab Orders page. Nothing to upload here.
      </p>

      {orders.some((o) => o.reports.length > 0) ? (
        <Card>
          <CardHeader>
            <CardTitle>Generated reports</CardTitle>
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
                        Resend to patient{r.patientPhone ? ` (${r.patientPhone})` : " (no phone on file)"}
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
      ) : (
        <p className="text-sm text-muted-foreground">No reports generated yet.</p>
      )}
    </div>
  );
}
