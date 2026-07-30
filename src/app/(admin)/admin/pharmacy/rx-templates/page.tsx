import { requireTenantId } from "@/lib/tenant";
import { listMedicines } from "@/lib/pharmacy";
import { listRxTemplates } from "@/lib/rxTemplates";
import { createRxTemplateAction } from "../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default async function RxTemplatesPage() {
  const tenantId = await requireTenantId();
  const [medicines, templates] = await Promise.all([
    listMedicines(tenantId, { isActive: true }),
    listRxTemplates(tenantId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Rx Templates</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Create template</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRxTemplateAction} className="flex flex-col gap-2">
            <Label htmlFor="name">Template name</Label>
            <Input id="name" name="name" placeholder="e.g. Malaria Protocol" required />
            <Label htmlFor="diseaseTag">Disease tag</Label>
            <Input id="diseaseTag" name="diseaseTag" placeholder="e.g. Malaria" required />
            <p className="text-sm font-medium mt-2">Medicine (1st item)</p>
            <Label htmlFor="medicineId0">Medicine</Label>
            <NativeSelect id="medicineId0" name="medicineId" required>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </NativeSelect>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="quantity0">Quantity</Label>
                <Input id="quantity0" name="quantity" type="number" min={1} defaultValue={1} required />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="dosage0">Dosage instructions</Label>
                <Input id="dosage0" name="dosageInstructions" placeholder="optional" />
              </div>
            </div>
            <p className="text-sm font-medium mt-2">Medicine (2nd item — optional)</p>
            <Label htmlFor="medicineId1">Medicine</Label>
            <NativeSelect id="medicineId1" name="medicineId">
              <option value="">— none —</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </NativeSelect>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="quantity1">Quantity</Label>
                <Input id="quantity1" name="quantity" type="number" min={1} defaultValue={1} />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="dosage1">Dosage instructions</Label>
                <Input id="dosage1" name="dosageInstructions" placeholder="optional" />
              </div>
            </div>
            <Button type="submit" className="mt-2">
              Save template
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Disease tag</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.diseaseTag}</TableCell>
                    <TableCell>
                      {t.items.map((i) => `${i.medicine.name} x${i.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell>{t.createdAt.toLocaleDateString()}</TableCell>
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
