import Link from "next/link";
import { Package, IndianRupee, Archive, Clock3, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requireTenantId } from "@/lib/tenant";
import { listMedicines } from "@/lib/pharmacy";
import { getPharmacyStats } from "@/lib/dashboardStats";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/stat-tile";

export const metadata = {
  title: "Pharmacy Dashboard",
};

function formatINR(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export default async function PharmacyDashboardPage() {
  const tenantId = await requireTenantId();
  const [allMedicines, lowStock, pharmacyStats] = await Promise.all([
    listMedicines(tenantId, { isActive: true }),
    listMedicines(tenantId, { isActive: true, lowStock: true }),
    getPharmacyStats(tenantId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Pharmacy Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active medicines" value={allMedicines.length} icon={Package} iconColor="blue" />
        <StatTile
          label="Low stock alerts"
          value={lowStock.length}
          icon={TriangleAlert}
          iconColor={lowStock.length > 0 ? "red" : "slate"}
          valueClassName={lowStock.length > 0 ? "text-red-500" : undefined}
        />
        <StatTile label="Revenue (30d)" value={formatINR(pharmacyStats.revenue)} sub={`${pharmacyStats.billsCount} bills`} icon={IndianRupee} iconColor="emerald" />
        <StatTile
          label="Inventory at cost"
          value={formatINR(pharmacyStats.inventoryAtCost)}
          sub={`MRP ${formatINR(pharmacyStats.inventoryAtMrp)}`}
          icon={Archive}
          iconColor="violet"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Dead stock"
          value={formatINR(pharmacyStats.deadStockAtCost)}
          valueClassName="text-amber-500"
          sub={`${pharmacyStats.skuCount} SKUs · no sale 90d`}
          icon={Package}
          iconColor="amber"
        />
        <StatTile
          label="Expiring within 30 days (at cost)"
          value={formatINR(pharmacyStats.expiringSoonValueAtCost)}
          valueClassName="text-amber-500"
          sub={`${pharmacyStats.expiringSoonCount} units · MRP ${formatINR(pharmacyStats.expiringSoonValueAtMrp)}`}
          icon={Clock3}
          iconColor="amber"
        />
      </div>

      {pharmacyStats.unpricedCount > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
          <span className="font-medium text-amber-800 dark:text-amber-300">
            {pharmacyStats.unpricedCount} medicine{pharmacyStats.unpricedCount === 1 ? "" : "s"} have no price set
          </span>{" "}
          <span className="text-amber-700 dark:text-amber-400">
            — dispensing these will bill patients ₹0, and their stock is excluded from the cost/dead-stock figures above.
          </span>{" "}
          <Link href="/admin/pharmacy/medicines?unpriced=true" className="font-medium text-primary hover:underline">
            Set prices →
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Top moving medicines</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {pharmacyStats.topMoving.length === 0 ? (
            <EmptyState icon={Package} message={<>No dispensing activity in this period.</>} />
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border">
              {pharmacyStats.topMoving.map((m) => (
                <li key={m.name} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted-foreground">
                    {formatINR(m.revenue)} · {m.qty} units
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
