import { requireTenantId } from "@/lib/tenant";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { listPrescriptions } from "@/lib/pharmacy";
import { listRxTemplates } from "@/lib/rxTemplates";
import {
  createPrescriptionActionResult,
  dispensePrescriptionActionResult,
  loadRxTemplateActionResult,
  createPharmacyInvoiceActionResult,
  billCollectAndDispenseActionResult,
  recordPharmacyPaymentActionResult,
  searchMedicinesAction,
  searchPatientsAction,
} from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ActionForm } from "@/components/action-form";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Dispense / Rx Queue",
};

export default async function DispensePage() {
  const tenantId = await requireTenantId();
  const [prescriptions, templates] = await Promise.all([listPrescriptions(tenantId), listRxTemplates(tenantId)]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dispense / Rx Queue</h1>

      {templates.length > 0 && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Load from template</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={loadRxTemplateActionResult} className="flex flex-col gap-2">
              <Label htmlFor="templateId">Template</Label>
              <NativeSelect id="templateId" name="templateId" required>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.diseaseTag})
                  </option>
                ))}
              </NativeSelect>
              <Label htmlFor="loadPatientId">Patient</Label>
              <SearchableSelect
                id="loadPatientId"
                name="patientId"
                required
                placeholder="Search patients by name, phone, or email…"
                search={searchPatientsAction}
              />
              <Button type="submit" variant="outline" className="mt-2">
                Load template &rarr; create prescription
              </Button>
            </ActionForm>
          </CardContent>
        </Card>
      )}

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Create prescription</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createPrescriptionActionResult} className="flex flex-col gap-2">
            <Label htmlFor="patientId">Patient</Label>
            <SearchableSelect
              id="patientId"
              name="patientId"
              required
              placeholder="Search patients by name, phone, or email…"
              search={searchPatientsAction}
            />
            <Label htmlFor="medicineId">Medicine</Label>
            <SearchableSelect
              id="medicineId"
              name="medicineId"
              required
              placeholder="Search medicines by name…"
              search={searchMedicinesAction}
            />
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" name="quantity" type="number" min={1} required />
            <Label htmlFor="dosageInstructions">Dosage instructions (optional)</Label>
            <Input id="dosageInstructions" name="dosageInstructions" />
            <Button type="submit" className="mt-2">
              Create prescription
            </Button>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue ({prescriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <EmptyState icon={Package} message={<>No prescriptions yet.</>} />
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
                        <div className="flex flex-col gap-1">
                          <ActionForm action={billCollectAndDispenseActionResult} className="flex items-center gap-1">
                            <input type="hidden" name="prescriptionId" value={p.id} />
                            <NativeSelect name="mode" className="w-24">
                              <option value="CASH">Cash</option>
                              <option value="UPI">UPI</option>
                              <option value="CARD">Card</option>
                              <option value="OTHER">Other</option>
                            </NativeSelect>
                            <Button type="submit" size="sm">
                              Bill, collect &amp; dispense
                            </Button>
                          </ActionForm>
                          <ActionForm action={createPharmacyInvoiceActionResult}>
                            <input type="hidden" name="prescriptionId" value={p.id} />
                            <Button type="submit" size="sm" variant="outline">
                              Just bill (pay later)
                            </Button>
                          </ActionForm>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">
                            {Number(p.invoice.amountPaid).toFixed(2)} / {Number(p.invoice.totalAmount).toFixed(2)} —{" "}
                            {p.invoice.status}
                          </span>
                          {p.invoice.status !== "PAID" && (
                            <ActionForm action={recordPharmacyPaymentActionResult} className="flex items-center gap-1">
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
                            </ActionForm>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.status === "PENDING" && (
                        <ActionForm action={dispensePrescriptionActionResult}>
                          <input type="hidden" name="prescriptionId" value={p.id} />
                          <Button type="submit" size="sm" variant="outline">
                            Dispense
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
