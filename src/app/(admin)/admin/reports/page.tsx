import { requireTenantId } from "@/lib/tenant";
import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getMasterReport, getCollectionByPaymentMode, getRevenueTrend, listTransactions, getSelfEfficacyReport } from "@/lib/reports";
import { listDoctorsForTenant } from "@/lib/appointments";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangePresets } from "@/components/date-range-presets";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RevenueTrendChart } from "@/components/revenue-trend-chart";
import type { PaymentMode } from "@prisma/client";

export const metadata = {
  title: "Reports",
};

const MASTER_REPORT_LABELS: Record<string, string> = {
  totalAppointments: "Total appointments",
  consultations: "Consultations",
  pharmacy: "Pharmacy",
  lab: "Lab",
  totalRevenue: "Total revenue",
  totalDiscounts: "Total discounts",
  totalRefunds: "Total refunds",
};

// Fixed categorical order/hues — never reassigned by rank, so "CASH" is
// always the same color regardless of which modes appear in a given range.
const PAYMENT_MODE_COLOR: Record<PaymentMode, string> = {
  CASH: "bg-blue-500",
  CARD: "bg-violet-500",
  UPI: "bg-emerald-500",
  RAZORPAY: "bg-amber-500",
  OTHER: "bg-slate-400",
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

  const [master, collection, revenueTrend, transactions, selfEfficacy, doctors] = await Promise.all([
    getMasterReport(tenantId, filters),
    getCollectionByPaymentMode(tenantId, filters),
    getRevenueTrend(tenantId, { from: filters.from, to: filters.to }),
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
        <CardContent className="flex flex-col gap-2 pt-0">
          <DateRangePresets
            basePath="/admin/reports"
            otherParams={{ doctorId: params.doctorId }}
            activeFrom={params.from}
            activeTo={params.to}
          />
          <form method="get" className="flex flex-wrap gap-2 pt-2">
            <DatePicker name="from" defaultValue={params.from} placeholder="From" />
            <DatePicker name="to" defaultValue={params.to} placeholder="To" />
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
            <CardContent className="pt-6">
              <RevenueTrendChart points={revenueTrend} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collection by payment mode</CardTitle>
              <p className="text-xs text-muted-foreground">Total ₹{collection.total.toLocaleString("en-IN")}</p>
            </CardHeader>
            <CardContent>
              {collection.byMode.length === 0 ? (
                <EmptyState icon={Receipt} message={<>No successful payments in this range.</>} />
              ) : (
                <div className="flex flex-col gap-3">
                  {collection.byMode.map((m) => (
                    <div key={m.mode} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">{m.mode}</span>
                      <div className="flex h-4 flex-1 items-center rounded-full bg-muted">
                        <div
                          className={`h-4 min-w-1 rounded-full ${PAYMENT_MODE_COLOR[m.mode]}`}
                          style={{ width: `${m.percent}%` }}
                        />
                      </div>
                      <span className="w-36 shrink-0 text-right text-sm font-medium">
                        ₹{m.amount.toLocaleString("en-IN")} <span className="text-xs text-muted-foreground">({m.percent}%)</span>
                      </span>
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
                <EmptyState icon={Receipt} message={<>No transactions in this range.</>} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Taxable</TableHead>
                      <TableHead>GST</TableHead>
                      <TableHead>Discount</TableHead>
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
                        <TableCell>{Number(t.invoice.subtotal).toFixed(2)}</TableCell>
                        <TableCell>
                          {(Number(t.invoice.cgstAmount) + Number(t.invoice.sgstAmount)).toFixed(2)}
                        </TableCell>
                        <TableCell>{Number(t.invoice.discountAmount).toFixed(2)}</TableCell>
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
