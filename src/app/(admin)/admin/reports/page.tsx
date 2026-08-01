import { requireTenantId } from "@/lib/tenant";
import { getMasterReport, getCollectionByPaymentMode, listTransactions, getSelfEfficacyReport } from "@/lib/reports";
import { listDoctorsForTenant } from "@/lib/appointments";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const MASTER_REPORT_LABELS: Record<string, string> = {
  totalAppointments: "Total appointments",
  consultations: "Consultations",
  pharmacy: "Pharmacy",
  lab: "Lab",
  totalRevenue: "Total revenue",
  totalDiscounts: "Total discounts",
  totalRefunds: "Total refunds",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; doctorId?: string }>;
}) {
  const tenantId = await requireTenantId();
  const params = await searchParams;

  const filters = {
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(params.to) : undefined,
    doctorId: params.doctorId || undefined,
  };

  const [master, collection, transactions, selfEfficacy, doctors] = await Promise.all([
    getMasterReport(tenantId, filters),
    getCollectionByPaymentMode(tenantId, filters),
    listTransactions(tenantId, { from: filters.from, to: filters.to }),
    getSelfEfficacyReport(tenantId, filters),
    listDoctorsForTenant(tenantId),
  ]);

  const exportQuery = new URLSearchParams();
  if (params.from) exportQuery.set("from", params.from);
  if (params.to) exportQuery.set("to", params.to);
  if (params.doctorId) exportQuery.set("doctorId", params.doctorId);
  const exportQs = exportQuery.toString() ? `?${exportQuery.toString()}` : "";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Reports</h1>

      <Card>
        <CardContent className="pt-0">
          <form method="get" className="flex flex-wrap gap-2 pt-4">
            <Input name="from" type="date" defaultValue={params.from ?? ""} className="w-40" />
            <Input name="to" type="date" defaultValue={params.to ?? ""} className="w-40" />
            <NativeSelect name="doctorId" defaultValue={params.doctorId ?? ""} className="w-52">
              <option value="">All doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.name}
                </option>
              ))}
            </NativeSelect>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="master">
        <TabsList>
          <TabsTrigger value="master">Master Report</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="self-efficacy">Self-Efficacy</TabsTrigger>
        </TabsList>

        <TabsContent value="master" className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <a
              href={`/admin/reports/export/master${exportQs}`}
              className="h-9 rounded-lg border px-4 text-sm font-medium leading-9 hover:bg-muted"
            >
              Export CSV
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Object.entries(master).map(([key, value]) => (
              <Card key={key}>
                <CardContent className="pt-0">
                  <div className="pt-4 text-xs text-muted-foreground">{MASTER_REPORT_LABELS[key] ?? key}</div>
                  <div className="text-2xl font-semibold">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Collection by payment mode</CardTitle>
              <p className="text-xs text-muted-foreground">Total ₹{collection.total.toLocaleString("en-IN")}</p>
            </CardHeader>
            <CardContent>
              {collection.byMode.length === 0 ? (
                <p className="text-sm text-muted-foreground">No successful payments in this range.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  {collection.byMode.map((m) => (
                    <div key={m.mode} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{m.mode}</span>
                        <span>{m.percent}%</span>
                      </div>
                      <div className="mt-1 text-lg font-semibold">₹{m.amount.toLocaleString("en-IN")}</div>
                      <div className="mt-2 h-1.5 rounded-full bg-muted">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${m.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <div className="mb-4 flex justify-end">
            <a
              href={`/admin/reports/export/transactions${exportQs}`}
              className="h-9 rounded-lg border px-4 text-sm font-medium leading-9 hover:bg-muted"
            >
              Export CSV
            </a>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions in this range.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Patient</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.paidAt.toLocaleString()}</TableCell>
                        <TableCell>{Number(t.amount).toFixed(2)}</TableCell>
                        <TableCell>{t.mode}</TableCell>
                        <TableCell>{t.status}</TableCell>
                        <TableCell className="font-medium">{t.invoice.invoiceNumber}</TableCell>
                        <TableCell>{t.invoice.patient.user.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="self-efficacy" className="mt-4">
          <div className="mb-4 flex justify-end">
            <a
              href={`/admin/reports/export/self-efficacy${exportQs}`}
              className="h-9 rounded-lg border px-4 text-sm font-medium leading-9 hover:bg-muted"
            >
              Export CSV
            </a>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Self-Efficacy (Patient Journey)</CardTitle>
              <p className="text-xs text-muted-foreground">
                {selfEfficacy.appointmentsConsidered} appointment(s) considered in range.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transition</TableHead>
                    <TableHead>Avg minutes</TableHead>
                    <TableHead>Sample size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selfEfficacy.transitions.map((t) => (
                    <TableRow key={`${t.from}-${t.to}`}>
                      <TableCell>
                        {t.from} → {t.to}
                      </TableCell>
                      <TableCell>{t.avgMinutes !== null ? t.avgMinutes.toFixed(1) : "—"}</TableCell>
                      <TableCell>{t.sampleSize}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
