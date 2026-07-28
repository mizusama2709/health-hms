import { requireTenantId } from "@/lib/tenant";
import { listSuppliers } from "@/lib/pharmacy";
import { createSupplierAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default async function SuppliersPage() {
  const tenantId = await requireTenantId();
  const suppliers = await listSuppliers(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Suppliers</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSupplierAction} className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
            <Label htmlFor="contactPhone">Contact phone (optional)</Label>
            <Input id="contactPhone" name="contactPhone" />
            <Label htmlFor="contactEmail">Contact email (optional)</Label>
            <Input id="contactEmail" name="contactEmail" type="email" />
            <Button type="submit" className="mt-2">
              Add supplier
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers ({suppliers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suppliers yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.contactPhone ?? "—"}</TableCell>
                    <TableCell>{s.contactEmail ?? "—"}</TableCell>
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
