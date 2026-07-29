import { requireTenantId } from "@/lib/tenant";
import { listLabTests } from "@/lib/lab";
import { createLabTestAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function LabTestsPage() {
  const tenantId = await requireTenantId();
  const tests = await listLabTests(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Lab Tests</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add lab test</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLabTestAction} className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. Complete Blood Count" required />
            <Label htmlFor="code">Code (optional)</Label>
            <Input id="code" name="code" placeholder="e.g. CBC" />
            <Label htmlFor="defaultPrice">Default price</Label>
            <Input id="defaultPrice" name="defaultPrice" type="number" step="0.01" required />
            <Label htmlFor="turnaroundTime">Turnaround time (optional)</Label>
            <Input id="turnaroundTime" name="turnaroundTime" placeholder="e.g. 24 hours" />
            <Button type="submit" className="mt-2">
              Add test
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalog ({tests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lab tests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Turnaround</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.code ?? "—"}</TableCell>
                    <TableCell>{Number(t.defaultPrice).toFixed(2)}</TableCell>
                    <TableCell>{t.turnaroundTime ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.isActive ? "default" : "secondary"}>{t.isActive ? "Active" : "Inactive"}</Badge>
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
