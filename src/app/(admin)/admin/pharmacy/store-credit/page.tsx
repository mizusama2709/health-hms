import { requireTenantId } from "@/lib/tenant";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { listInvoices } from "@/lib/billing";
import { listStoreCredits } from "@/lib/pharmacy";
import { recordPharmacyReturnActionResult, searchPatientsAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ActionForm } from "@/components/action-form";

export const metadata = {
  title: "Store Credit",
};

export default async function StoreCreditPage() {
  const tenantId = await requireTenantId();
  const [pharmacyInvoices, storeCredits] = await Promise.all([
    listInvoices(tenantId, { serviceType: "PHARMACY" }),
    listStoreCredits(tenantId),
  ]);

  const pharmacyLineItems = pharmacyInvoices.flatMap((inv) =>
    inv.lineItems.map((li) => ({ ...li, invoiceId: inv.id, invoiceNumber: inv.invoiceNumber }))
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Store Credit</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Record a pharmacy return</CardTitle>
        </CardHeader>
        <CardContent>
          {pharmacyLineItems.length === 0 ? (
            <EmptyState icon={Package} message={<>No pharmacy line items to return yet.</>} />
          ) : (
            <ActionForm
              action={recordPharmacyReturnActionResult}
              className="flex flex-col gap-2"
              confirmMessage="Record this pharmacy return? This cannot be undone."
            >
              <Label htmlFor="invoiceLineItemId">Pharmacy line item</Label>
              <NativeSelect id="invoiceLineItemId" name="invoiceLineItemId" required>
                {pharmacyLineItems.map((li) => (
                  <option key={li.id} value={li.id}>
                    {li.invoiceNumber} — {li.description} (qty {li.quantity})
                  </option>
                ))}
              </NativeSelect>
              <Label htmlFor="quantityReturned">Quantity returned</Label>
              <Input id="quantityReturned" name="quantityReturned" type="number" min={1} required />
              <Label htmlFor="refundAmount">Refund amount</Label>
              <Input id="refundAmount" name="refundAmount" type="number" step="0.01" min="0" required />
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" name="reason" />
              <Label htmlFor="patientId">Patient (required if issuing as store credit)</Label>
              <SearchableSelect
                id="patientId"
                name="patientId"
                placeholder="Search patients by name, phone, or email…"
                search={searchPatientsAction}
              />
              <Label className="flex items-center gap-2 text-sm font-normal">
                <input type="checkbox" name="asStoreCredit" value="true" className="size-4" />
                Issue as store credit instead of cash refund
              </Label>
              <Button type="submit" className="mt-2 self-start">
                Record return
              </Button>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store credits ({storeCredits.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {storeCredits.length === 0 ? (
            <EmptyState icon={Package} message={<>No store credits issued yet.</>} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storeCredits.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.patient.user.name}</TableCell>
                    <TableCell>{Number(c.amount).toFixed(2)}</TableCell>
                    <TableCell>{c.reason ?? "—"}</TableCell>
                    <TableCell>{c.createdAt.toLocaleString()}</TableCell>
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
