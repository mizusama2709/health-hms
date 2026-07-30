import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireTenantId } from "@/lib/tenant";
import { getInvoiceWithBalance } from "@/lib/billing";
import { editInvoiceAction } from "../../../actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = await requireTenantId();

  const invoice = await getInvoiceWithBalance(id, tenantId);
  if (!invoice) notFound();

  const firstLine = invoice.lineItems[0];

  async function save(formData: FormData) {
    "use server";
    await editInvoiceAction(formData);
    redirect("/admin/billing/invoices");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/billing/invoices" className="text-sm font-medium text-primary hover:underline">
          ← Back to invoices
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit {invoice.invoiceNumber}</h1>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Line item</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={save} className="flex flex-col gap-3">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={firstLine?.description} required />
            <Label htmlFor="unitPrice">Amount</Label>
            <Input id="unitPrice" name="unitPrice" type="number" step="0.01" defaultValue={firstLine ? Number(firstLine.unitPrice) : ""} required />
            <Button type="submit" className="mt-2">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
