import { notFound } from "next/navigation";
import { requireTenantId } from "@/lib/tenant";
import { getInvoiceWithBalance } from "@/lib/billing";
import { editInvoiceActionResult } from "../../../actions";
import { BackLink } from "@/components/back-link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/action-form";

export const metadata = {
  title: "Edit Invoice",
};

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await requireTenantId();

  const invoice = await getInvoiceWithBalance(id, tenantId);
  if (!invoice) notFound();

  const firstLine = invoice.lineItems[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BackLink href="/admin/billing/invoices" label="invoices" />
        <h1 className="mt-2 text-2xl font-semibold">Edit {invoice.invoiceNumber}</h1>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Line item</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={editInvoiceActionResult}
            className="flex flex-col gap-3"
            nextStep={{ label: "Back to invoices", href: "/admin/billing/invoices" }}
          >
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={firstLine?.description} required />
            <Label htmlFor="unitPrice">Amount</Label>
            <Input id="unitPrice" name="unitPrice" type="number" step="0.01" defaultValue={firstLine ? Number(firstLine.unitPrice) : ""} required />
            <Button type="submit" className="mt-2">
              Save changes
            </Button>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
