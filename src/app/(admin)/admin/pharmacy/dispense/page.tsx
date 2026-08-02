import { requireTenantId } from "@/lib/tenant";
import { listPrescriptions, listMedicines } from "@/lib/pharmacy";
import { listRxTemplates } from "@/lib/rxTemplates";
import {
  createPrescriptionAction,
  dispensePrescriptionAction,
  loadRxTemplateAction,
  createPharmacyInvoiceAction,
  recordPharmacyPaymentAction,
} from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Dispense / Rx Queue",
};

export default async function DispensePage() {
  const tenantId = await requireTenantId();
  const [prescriptions, medicines, templates] = await Promise.all([
    listPrescriptions(tenantId),
    listMedicines(tenantId, { isActive: true }),
    listRxTemplates(tenantId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dispense / Rx Queue</h1>

      {templates.length > 0 && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Load from template</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={loadRxTemplateAction} className="flex flex-col gap-2">
              <Label htmlFor="templateId">Template</Label>
              <NativeSelect id="templateId" name="templateId" required>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.diseaseTag})
                  </option>
                ))}
              </NativeSelect>
              <Label htmlFor="loadPatientEmail">Patient email</Label>
              <Input id="loadPatientEmail" name="patientEmail" type="email" required />
              <Button type="submit" variant="outline" className="mt-2">
                Load template &rarr; create prescription
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Create prescription</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPrescriptionAction} className="flex flex-col gap-2">
            <Label htmlFor="patientEmail">Patient email</Label>
            <Input id="patientEmail" name="patientEmail" type="email" required />
            <Label htmlFor="medicineId">Medicine</Label>
            <SearchableSelect
              id="medicineId"
              name="medicineId"
              required
              placeholder="Search medicines by name…"
              options={medicines.map((m) => ({
                value: m.id,
                label: `${m.name} (stock: ${m.stockQuantity})${Number(m.unitPrice) === 0 ? " — ⚠ no price set" : ""}`,
              }))}
            />
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" name="quantity" type="number" min={1} required />
            <Label htmlFor="dosageInstructions">Dosage instructions (optional)</Label>
            <Input id="dosageInstructions" name="dosageInstructions" />
            <Button type="submit" className="mt-2">
              Create prescription
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue ({prescriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prescriptions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.patient.user.name}</TableCell>
                    <TableCell>
                      {p.items.map((i) => `${i.medicine.name} x${i.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "DISPENSED" ? "default" : "outline"}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>{p.createdAt.toLocaleString()}</TableCell>
                    <TableCell>
                      {!p.invoice ? (
                        <form action={createPharmacyInvoiceAction}>
                          <input type="hidden" name="prescriptionId" value={p.id} />
                          <Button type="submit" size="sm" variant="outline">
                            Prepare &amp; bill
                          </Button>
                        </form>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">
                            {Number(p.invoice.amountPaid).toFixed(2)} / {Number(p.invoice.totalAmount).toFixed(2)} —{" "}
                            {p.invoice.status}
                          </span>
                          {p.invoice.status !== "PAID" && (
                            <form action={recordPharmacyPaymentAction} className="flex items-center gap-1">
                              <input type="hidden" name="invoiceId" value={p.invoice.id} />
                              <Input name="amount" type="number" step="0.01" min={0} className="w-20" placeholder="Amount" />
                              <NativeSelect name="mode" className="w-24">
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="CARD">Card</option>
                                <option value="OTHER">Other</option>
                              </NativeSelect>
                              <Button type="submit" size="sm" variant="outline">
                                Collect
                              </Button>
                            </form>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.status === "PENDING" && (
                        <form action={dispensePrescriptionAction}>
                          <input type="hidden" name="prescriptionId" value={p.id} />
                          <Button type="submit" size="sm" variant="outline">
                            Dispense
                          </Button>
                        </form>
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
