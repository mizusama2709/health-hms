import { requireTenantId } from "@/lib/tenant";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { listLabOrders, listLatestWhatsAppStatusForLabReports } from "@/lib/lab";
import { withFreshDocumentToken } from "@/lib/documentUrlSigning";
import { sendLabReportWhatsAppAction } from "../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Lab Reports",
};

const STATUS_LABEL: Record<string, string> = {
  SENT: "Sent",
  SIMULATED: "Sent (simulated)",
  FAILED: "Delivery failed",
};

export default async function LabReportsPage() {
  const tenantId = await requireTenantId();
  const orders = await listLabOrders(tenantId);
  const reportIds = orders.flatMap((o) => o.reports.map((r) => r.id));
  const whatsAppStatusByReportId = await listLatestWhatsAppStatusForLabReports(tenantId, reportIds);

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
              .map((r) => {
                const whatsAppStatus = whatsAppStatusByReportId.get(r.id);
                return (
                <div key={r.id} className="flex flex-col gap-2 rounded-md border p-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={withFreshDocumentToken(r.fileUrl, "lab_report", r.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {r.patientName}
                    </a>
                    <span>— {r.uploadedAt.toLocaleString()}</span>
                    {whatsAppStatus && (
                      <Badge
                        variant={whatsAppStatus.status === "FAILED" ? "destructive" : "default"}
                        title={whatsAppStatus.errorMessage ?? undefined}
                      >
                        {STATUS_LABEL[whatsAppStatus.status] ?? whatsAppStatus.status}
                      </Badge>
                    )}
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
                );
              })}
          </CardContent>
        </Card>
      ) : (
        <EmptyState icon={BarChart3} message={<>No reports generated yet.</>} />
      )}
    </div>
  );
}
