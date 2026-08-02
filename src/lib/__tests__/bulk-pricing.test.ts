import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { bulkUpdateMedicinePrices } from "@/lib/pharmacy";

let tenantId: string;
const createdMedicineIds: string[] = [];

beforeAll(async () => {
  const tenant = await db.tenant.findFirstOrThrow();
  tenantId = tenant.id;
});

afterEach(async () => {
  for (const id of createdMedicineIds.splice(0)) {
    await db.medicine.deleteMany({ where: { id } });
  }
});

describe("bulkUpdateMedicinePrices", () => {
  it("prices matching medicines, skips a header row, and reports unmatched/invalid rows", async () => {
    const a = await db.medicine.create({ data: { tenantId, name: "TEST-BulkPrice-A", unitPrice: 0 } });
    const b = await db.medicine.create({ data: { tenantId, name: "TEST-BulkPrice-B", unitPrice: 0 } });
    createdMedicineIds.push(a.id, b.id);

    const csv = [
      "name,unitPrice",
      "TEST-BulkPrice-A,25.50",
      "test-bulkprice-b,10", // case-insensitive match
      "TEST-BulkPrice-Nonexistent,15",
      "missing-price-column",
      "TEST-BulkPrice-A,-5", // invalid: negative price
    ].join("\n");

    const result = await bulkUpdateMedicinePrices(tenantId, csv);

    expect(result.matched).toBe(2);
    expect(result.notFound).toBe(1);
    expect(result.notFoundNames).toContain("TEST-BulkPrice-Nonexistent");
    expect(result.invalidRows).toBe(2);

    const finalA = await db.medicine.findUniqueOrThrow({ where: { id: a.id } });
    const finalB = await db.medicine.findUniqueOrThrow({ where: { id: b.id } });
    expect(Number(finalA.unitPrice)).toBe(25.5);
    expect(Number(finalB.unitPrice)).toBe(10);
  });
});
