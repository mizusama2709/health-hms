import { requireTenantId } from "@/lib/tenant";
import { listLabOrders, listLabTests } from "@/lib/lab";
import { createLabOrderAction, updateLabOrderStatusAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function LabOrdersPage() {
  const tenantId = await requireTenantId();
  const [orders, tests] = await Promise.all([listLabOrders(tenantId), listLabTests(tenantId, { isActive: true })]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Lab Orders</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Order a test</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLabOrderAction} className="flex flex-col gap-2">
            <Label htmlFor="patientEmail">Patient email</Label>
            <Input id="patientEmail" name="patientEmail" type="email" required />
            <Label htmlFor="testId">Test</Label>
            <NativeSelect id="testId" name="testId" required>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {Number(t.defaultPrice).toFixed(2)}
                </option>
              ))}
            </NativeSelect>
            <Button type="submit" className="mt-2">
              Create order
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lab orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.patient.user.name}</TableCell>
                    <TableCell>{o.items.map((i) => i.labTest.name).join(", ")}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "COMPLETED" ? "default" : "outline"}>{o.status}</Badge>
                    </TableCell>
                    <TableCell>{o.orderedAt.toLocaleString()}</TableCell>
                    <TableCell>{o.reports.length}</TableCell>
                    <TableCell>
                      <form action={updateLabOrderStatusAction} className="flex items-center gap-1">
                        <input type="hidden" name="labOrderId" value={o.id} />
                        <NativeSelect name="status" defaultValue={o.status} className="w-36">
                          <option value="ORDERED">Ordered</option>
                          <option value="IN_PROGRESS">In progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </NativeSelect>
                        <Button type="submit" size="sm" variant="outline">
                          Save
                        </Button>
                      </form>
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
