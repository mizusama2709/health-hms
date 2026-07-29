import { requireTenantId } from "@/lib/tenant";
import { listMedicines } from "@/lib/pharmacy";
import { createMedicineAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function MedicinesPage() {
  const tenantId = await requireTenantId();
  const medicines = await listMedicines(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Medicines</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add medicine</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMedicineAction} className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. Paracetamol 500mg" required />
            <Label htmlFor="sku">SKU (optional)</Label>
            <Input id="sku" name="sku" />
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="unitPrice">Unit price</Label>
                <Input id="unitPrice" name="unitPrice" type="number" step="0.01" required />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="stockQuantity">Initial stock</Label>
                <Input id="stockQuantity" name="stockQuantity" type="number" defaultValue={0} />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="reorderLevel">Reorder level</Label>
                <Input id="reorderLevel" name="reorderLevel" type="number" />
              </div>
            </div>
            <Button type="submit" className="mt-2">
              Add medicine
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory ({medicines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {medicines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No medicines yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reorder level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicines.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.sku ?? "—"}</TableCell>
                    <TableCell>{Number(m.unitPrice).toFixed(2)}</TableCell>
                    <TableCell>
                      {m.reorderLevel !== null && m.stockQuantity <= m.reorderLevel ? (
                        <Badge variant="destructive">{m.stockQuantity}</Badge>
                      ) : (
                        m.stockQuantity
                      )}
                    </TableCell>
                    <TableCell>{m.reorderLevel ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={m.isActive ? "default" : "secondary"}>{m.isActive ? "Active" : "Inactive"}</Badge>
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
