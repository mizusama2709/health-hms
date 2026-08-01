import { requireTenantId } from "@/lib/tenant";
import { listServices } from "@/lib/services";
import { createServiceAction, toggleServiceActiveAction } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Services",
};

export default async function ServicesPage() {
  const tenantId = await requireTenantId();
  const services = await listServices(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Services</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add service</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createServiceAction} className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. General Consultation" required />
            <Label htmlFor="serviceType">Type</Label>
            <NativeSelect id="serviceType" name="serviceType" required>
              <option value="CONSULTATION">Consultation</option>
              <option value="LAB">Lab</option>
              <option value="PHARMACY">Pharmacy</option>
            </NativeSelect>
            <Label htmlFor="defaultUnitPrice">Default price</Label>
            <Input id="defaultUnitPrice" name="defaultUnitPrice" type="number" step="0.01" required />
            <Label htmlFor="taxRatePercent">GST rate (%)</Label>
            <Input id="taxRatePercent" name="taxRatePercent" type="number" step="0.01" defaultValue={0} placeholder="e.g. 18" />
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" />
            <Button type="submit" className="mt-2">
              Add service
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalog ({services.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.serviceType}</TableCell>
                    <TableCell>{Number(s.defaultUnitPrice).toFixed(2)}</TableCell>
                    <TableCell>{Number(s.taxRatePercent)}%</TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>
                      <form action={toggleServiceActiveAction}>
                        <input type="hidden" name="serviceId" value={s.id} />
                        <input type="hidden" name="isActive" value={String(s.isActive)} />
                        <Button type="submit" size="sm" variant="outline">
                          {s.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </form>
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
