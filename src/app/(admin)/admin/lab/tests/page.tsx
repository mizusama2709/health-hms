import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requireTenantId } from "@/lib/tenant";
import { listLabTests } from "@/lib/lab";
import { createLabTestActionResult, deleteLabTestActionResult } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/action-form";

export const metadata = {
  title: "Lab Tests",
};

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
          <ActionForm action={createLabTestActionResult} className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. Complete Blood Count" required />
            <Label htmlFor="code">Code (optional)</Label>
            <Input id="code" name="code" placeholder="e.g. CBC" />
            <Label htmlFor="sampleType">Sample (optional)</Label>
            <Input id="sampleType" name="sampleType" placeholder="e.g. Blood, Urine" />
            <Label htmlFor="defaultPrice">Default price</Label>
            <Input id="defaultPrice" name="defaultPrice" type="number" step="0.01" required />
            <Label htmlFor="gstPercent">GST % (optional)</Label>
            <Input id="gstPercent" name="gstPercent" type="number" step="0.01" min="0" placeholder="0" />
            <Label htmlFor="turnaroundTime">Turnaround time (optional)</Label>
            <Input id="turnaroundTime" name="turnaroundTime" placeholder="e.g. 24 hours" />
            <Button type="submit" className="mt-2">
              Add test
            </Button>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalog ({tests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <EmptyState icon={FlaskConical} message={<>No lab tests yet.</>} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Sample</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>GST %</TableHead>
                  <TableHead>Turnaround</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.code ?? "—"}</TableCell>
                    <TableCell>{t.sampleType ?? "—"}</TableCell>
                    <TableCell>₹{Number(t.defaultPrice).toFixed(2)}</TableCell>
                    <TableCell>{Number(t.gstPercent)}</TableCell>
                    <TableCell>{t.turnaroundTime ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.isActive ? "default" : "secondary"}>{t.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Link href={`/admin/lab/tests/${t.id}/parameters`} className="font-medium text-primary hover:underline">
                          Edit
                        </Link>
                        <ActionForm
                          action={deleteLabTestActionResult}
                          confirmMessage={`Delete "${t.name}"? This cannot be undone.`}
                        >
                          <input type="hidden" name="labTestId" value={t.id} />
                          <button type="submit" className="font-medium text-destructive hover:underline">
                            Delete
                          </button>
                        </ActionForm>
                      </div>
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
