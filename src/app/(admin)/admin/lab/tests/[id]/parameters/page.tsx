import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenantId } from "@/lib/tenant";
import { getLabTest } from "@/lib/lab";
import { createLabTestParameterActionResult, deleteLabTestParameterActionResult } from "../../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ActionForm } from "@/components/action-form";

export const metadata = {
  title: "Lab Test Parameters",
};

function formatRange(p: { referenceLow: unknown; referenceHigh: unknown; referenceText: string | null; unit: string | null }) {
  if (p.referenceText) return p.referenceText;
  if (p.referenceLow !== null && p.referenceHigh !== null) {
    return `${p.referenceLow} – ${p.referenceHigh}${p.unit ? ` ${p.unit}` : ""}`;
  }
  if (p.referenceLow !== null) return `≥ ${p.referenceLow}${p.unit ? ` ${p.unit}` : ""}`;
  if (p.referenceHigh !== null) return `≤ ${p.referenceHigh}${p.unit ? ` ${p.unit}` : ""}`;
  return "—";
}

export default async function LabTestParametersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await requireTenantId();
  const test = await getLabTest(tenantId, id);
  if (!test) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/lab/tests" className="text-sm font-medium text-primary hover:underline">
          ← Back to Lab Tests
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{test.name}</h1>
        <p className="text-sm text-muted-foreground">
          {test.code ?? "No code"} · {test.sampleType ?? "No sample type"} · ₹{Number(test.defaultPrice).toFixed(2)}
          {Number(test.gstPercent) > 0 && ` · GST ${Number(test.gstPercent)}%`}
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Add parameter / reference range</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={createLabTestParameterActionResult} className="flex flex-col gap-2">
            <input type="hidden" name="labTestId" value={test.id} />
            <Label htmlFor="name">Parameter name</Label>
            <Input id="name" name="name" placeholder="e.g. Hemoglobin" required />
            <Label htmlFor="unit">Unit (optional)</Label>
            <Input id="unit" name="unit" placeholder="e.g. g/dL" />
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="referenceLow">Range low (optional)</Label>
                <Input id="referenceLow" name="referenceLow" type="number" step="0.01" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="referenceHigh">Range high (optional)</Label>
                <Input id="referenceHigh" name="referenceHigh" type="number" step="0.01" />
              </div>
            </div>
            <Label htmlFor="referenceText">Or a non-numeric range (optional)</Label>
            <Input id="referenceText" name="referenceText" placeholder="e.g. Non-reactive, Negative" />
            <Button type="submit" className="mt-2 self-start">
              Add parameter
            </Button>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parameters ({test.parameters.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {test.parameters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No parameters yet — simple tests that report a single value don&apos;t need any.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reference range</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {test.parameters.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.unit ?? "—"}</TableCell>
                    <TableCell>{formatRange(p)}</TableCell>
                    <TableCell>
                      <ActionForm
                        action={deleteLabTestParameterActionResult}
                        confirmMessage={`Delete parameter "${p.name}"?`}
                      >
                        <input type="hidden" name="parameterId" value={p.id} />
                        <input type="hidden" name="labTestId" value={test.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Delete
                        </Button>
                      </ActionForm>
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
