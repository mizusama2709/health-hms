import { requireTenantId } from "@/lib/tenant";
import { listGoodsReceipts, listSuppliers, listMedicines } from "@/lib/pharmacy";
import { createGoodsReceiptAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";

export const metadata = {
  title: "Goods Receipt",
};

export default async function GoodsReceiptPage() {
  const tenantId = await requireTenantId();
  const [receipts, suppliers, medicines] = await Promise.all([
    listGoodsReceipts(tenantId),
    listSuppliers(tenantId),
    listMedicines(tenantId, { isActive: true }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Goods Receipt</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Record a receipt</CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 || medicines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add at least one supplier and one medicine before recording a goods receipt.
            </p>
          ) : (
            <form action={createGoodsReceiptAction} className="flex flex-col gap-2">
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
                options={medicines.map((m) => ({
                  value: m.id,
                  label: `${m.name} (current stock: ${m.stockQuantity})`,
                }))}
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
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipts ({receipts.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goods receipts yet.</p>
          ) : (
            receipts.map((r) => (
              <div key={r.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">
                  {r.supplier.name} — {r.receivedAt.toLocaleString()}
                </div>
                {r.lineItems.map((li) => (
                  <div key={li.id} className="text-muted-foreground">
                    {li.medicine.name}: +{li.quantityReceived} @ {Number(li.unitCost).toFixed(2)}
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
