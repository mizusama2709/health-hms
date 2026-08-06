import { db } from "@/lib/db";

// Small, cheap counts surfaced as sidebar badges so "needs attention" work
// (unpriced medicines, lab orders awaiting results) is visible before
// someone opens the section — matches the definitions already used on the
// Pharmacy Dashboard's unpriced-medicines banner and Lab Orders' status filter.
export async function getNavBadgeCounts(tenantId: string) {
  const [unpricedMedicines, pendingLabOrders] = await Promise.all([
    db.medicine.count({ where: { tenantId, unitPrice: 0 } }),
    db.labOrder.count({ where: { tenantId, status: { in: ["ORDERED", "IN_PROGRESS"] } } }),
  ]);
  return { unpricedMedicines, pendingLabOrders };
}
