import { Fragment } from "react";
import { requireTenantId } from "@/lib/tenant";
import { listLabOrders, listLabTests } from "@/lib/lab";
import { createLabOrderAction, updateLabOrderStatusAction, approveLabOrderAction, recordLabResultAction } from "../actions";
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
                  <TableHead>Approval</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <Fragment key={o.id}>
                    <TableRow>
                      <TableCell className="font-medium">{o.patient.user.name}</TableCell>
                      <TableCell>{o.items.map((i) => i.labTest.name).join(", ")}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === "COMPLETED" ? "default" : "outline"}>{o.status}</Badge>
                      </TableCell>
                      <TableCell>{o.orderedAt.toLocaleString()}</TableCell>
                      <TableCell>
                        {o.approvedAt ? (
                          <Badge variant="default">Approved {o.approvedAt.toLocaleDateString()}</Badge>
                        ) : o.status === "COMPLETED" ? (
                          <form action={approveLabOrderAction}>
                            <input type="hidden" name="labOrderId" value={o.id} />
                            <Button type="submit" size="sm" variant="outline">
                              Approve &amp; finalize
                            </Button>
                          </form>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
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
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/40">
                        <details>
                          <summary className="cursor-pointer text-sm font-medium text-primary">
                            Enter results ({o.items.length} test{o.items.length === 1 ? "" : "s"})
                          </summary>
                          <div className="mt-2 flex flex-col gap-2">
                            {o.items.map((item) => (
                              <form
                                key={item.id}
                                action={recordLabResultAction}
                                className="flex flex-wrap items-end gap-2 rounded-md border bg-background p-2"
                              >
                                <input type="hidden" name="labOrderItemId" value={item.id} />
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">Test</span>
                                  <span className="text-sm font-medium">{item.labTest.name}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">Result</span>
                                  <Input name="resultValue" defaultValue={item.resultValue ?? ""} className="w-32" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">Unit</span>
                                  <Input name="resultUnit" defaultValue={item.resultUnit ?? ""} className="w-24" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">Reference range</span>
                                  <Input name="referenceRange" defaultValue={item.referenceRange ?? ""} className="w-32" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">Flag</span>
                                  <NativeSelect name="flag" defaultValue={item.flag ?? ""} className="w-32">
                                    <option value="">—</option>
                                    <option value="NORMAL">Normal</option>
                                    <option value="ABNORMAL">Abnormal</option>
                                    <option value="CRITICAL">Critical</option>
                                  </NativeSelect>
                                </div>
                                <Button type="submit" size="sm" variant="outline">
                                  Save result
                                </Button>
                              </form>
                            ))}
                          </div>
                        </details>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
