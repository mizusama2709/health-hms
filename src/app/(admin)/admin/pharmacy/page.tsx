import { requireTenantId } from "@/lib/tenant";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { listMedicines } from "@/lib/pharmacy";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Pharmacy Dashboard",
};

export default async function PharmacyDashboardPage() {
  const tenantId = await requireTenantId();
  const [allMedicines, lowStock] = await Promise.all([
    listMedicines(tenantId, { isActive: true }),
    listMedicines(tenantId, { isActive: true, lowStock: true }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Pharmacy Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-0">
            <div className="pt-4 text-xs text-muted-foreground">Active medicines</div>
            <div className="text-2xl font-semibold">{allMedicines.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-0">
            <div className="pt-4 text-xs text-muted-foreground">Low stock alerts</div>
            <div className="text-2xl font-semibold">{lowStock.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Low stock</CardTitle>
        </CardHeader>
        <CardContent>
          {lowStock.length === 0 ? (
            <EmptyState icon={Package} message={<>No medicines below their reorder level.</>} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reorder level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{m.stockQuantity}</Badge>
                    </TableCell>
                    <TableCell>{m.reorderLevel}</TableCell>
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
