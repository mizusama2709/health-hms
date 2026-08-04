import { requireTenantId } from "@/lib/tenant";
import { listGoodsReceipts, listSuppliers, countMedicines } from "@/lib/pharmacy";
import { createGoodsReceiptActionResult, searchMedicinesAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ActionForm } from "@/components/action-form";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export const metadata = {
  title: "Goods Receipt",
};

export default async function GoodsReceiptPage() {
  const tenantId = await requireTenantId();
  const [receipts, suppliers, medicineCount] = await Promise.all([
    listGoodsReceipts(tenantId),
    listSuppliers(tenantId),
    countMedicines(tenantId, { isActive: true }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Goods Receipt</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Record a receipt</CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 || medicineCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add at least one supplier and one medicine before recording a goods receipt.
            </p>
          ) : (
            <ActionForm action={createGoodsReceiptActionResult} className="flex flex-col gap-2">
              <Label htmlFor="supplierId">Supplier</Label>
              <NativeSelect id="supplierId" name="supplierId" required>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
              <Label htmlFor="medicineId">Medicine</Label>
              <SearchableSelect
                id="medicineId"
                name="medicineId"
                required
                placeholder="Search medicines by name…"
                search={searchMedicinesAction}
              />
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="quantityReceived">Quantity received</Label>
                  <Input id="quantityReceived" name="quantityReceived" type="number" min={1} required />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="unitCost">Unit cost</Label>
                  <Input id="unitCost" name="unitCost" type="number" step="0.01" required />
                </div>
              </div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" name="notes" />
              <Button type="submit" className="mt-2">
                Record receipt
              </Button>
            </ActionForm>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipts ({receipts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goods receipts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Qty received</TableHead>
                  <TableHead>Unit cost</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.flatMap((r) =>
                  r.lineItems.map((li) => (
                    <TableRow key={li.id}>
                      <TableCell className="font-medium">{r.supplier.name}</TableCell>
                      <TableCell>{r.receivedAt.toLocaleString()}</TableCell>
                      <TableCell>{li.medicine.name}</TableCell>
                      <TableCell>+{li.quantityReceived}</TableCell>
                      <TableCell>{Number(li.unitCost).toFixed(2)}</TableCell>
                      <TableCell>{r.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
