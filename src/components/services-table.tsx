"use client";

import * as React from "react";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm, type ActionResult } from "@/components/action-form";

type Service = {
  id: string;
  name: string;
  serviceType: string;
  defaultUnitPrice: unknown;
  taxRatePercent: unknown;
  isActive: boolean;
};

/**
 * Services was the one catalog-style table with only single-row actions —
 * turning a whole category on/off (e.g. retiring every LAB service at
 * once) meant clicking Deactivate one row at a time. Checkbox selection +
 * a bulk action bar closes that gap; per-row toggle stays for the
 * one-at-a-time case.
 */
export function ServicesTable({
  services,
  toggleAction,
  bulkAction,
}: {
  services: Service[];
  toggleAction: (prevState: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  bulkAction: (prevState: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [isPending, startTransition] = React.useTransition();

  const allSelected = services.length > 0 && selected.size === services.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(services.map((s) => s.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulk(isActive: boolean) {
    const ids = [...selected];
    startTransition(async () => {
      const formData = new FormData();
      for (const id of ids) formData.append("serviceIds", id);
      formData.set("isActive", String(isActive));
      const result = await bulkAction(undefined, formData);
      if (result.success) {
        toast.success(result.message ?? "Done");
        setSelected(new Set());
      } else {
        toast.error(result.message ?? "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => runBulk(true)}>
              Activate
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => runBulk(false)}>
              Deactivate
            </Button>
          </div>
          <button type="button" className="ml-auto text-xs text-muted-foreground hover:underline" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <input
                type="checkbox"
                aria-label="Select all services"
                checked={allSelected}
                onChange={toggleAll}
                className="size-4"
              />
            </TableHead>
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
              <TableCell>
                <input
                  type="checkbox"
                  aria-label={`Select ${s.name}`}
                  checked={selected.has(s.id)}
                  onChange={() => toggleOne(s.id)}
                  className="size-4"
                />
              </TableCell>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>{s.serviceType}</TableCell>
              <TableCell>{Number(s.defaultUnitPrice).toFixed(2)}</TableCell>
              <TableCell>{Number(s.taxRatePercent)}%</TableCell>
              <TableCell>
                <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
              </TableCell>
              <TableCell>
                <ActionForm action={toggleAction}>
                  <input type="hidden" name="serviceId" value={s.id} />
                  <input type="hidden" name="isActive" value={String(s.isActive)} />
                  <Button type="submit" size="sm" variant="outline">
                    {s.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </ActionForm>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
