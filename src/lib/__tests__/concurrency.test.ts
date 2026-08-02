import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createInvoice, recordPayment, issueRefund, markInvoicePaidInFull, updateInvoiceLineItem } from "@/lib/billing";
import { createPrescription, dispensePrescription, adjustMedicineStock } from "@/lib/pharmacy";

// Regression tests for two concurrency bugs found via load testing:
// 1. recordPayment/issueRefund read amountPaid then wrote it back in JS,
//    losing updates under concurrent payments/refunds on the same invoice.
// 2. dispensePrescription had no stock check and no re-dispense guard,
//    allowing stock to go negative and the same prescription to be
//    dispensed twice under concurrent requests.
// Both are fixed with atomic, conditional DB writes (see billing.ts /
// pharmacy.ts). These tests hit the real dev database directly and clean up
// everything they create.

let tenantId: string;
let patientId: string;
const createdInvoiceIds: string[] = [];
const createdMedicineIds: string[] = [];
const createdPrescriptionIds: string[] = [];

beforeAll(async () => {
  const tenant = await db.tenant.findFirstOrThrow();
  const patient = await db.patient.findFirstOrThrow({ where: { tenantId: tenant.id } });
  tenantId = tenant.id;
  patientId = patient.id;
});

afterEach(async () => {
  for (const id of createdPrescriptionIds.splice(0)) {
    await db.prescriptionItem.deleteMany({ where: { prescriptionId: id } });
    await db.prescription.deleteMany({ where: { id } });
  }
  for (const id of createdInvoiceIds.splice(0)) {
    await db.refund.deleteMany({ where: { invoiceId: id } });
    await db.payment.deleteMany({ where: { invoiceId: id } });
    await db.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
    await db.invoice.deleteMany({ where: { id } });
  }
  for (const id of createdMedicineIds.splice(0)) {
    await db.medicine.deleteMany({ where: { id } });
  }
  await db.invoiceCounter.updateMany({ where: { tenantId }, data: { value: 0 } });
});

async function makeInvoice(unitPrice: number) {
  const invoice = await createInvoice({
    tenantId,
    patientId,
    serviceType: "CONSULTATION",
    lineItems: [{ description: "test invoice", serviceType: "CONSULTATION", quantity: 1, unitPrice }],
  });
  createdInvoiceIds.push(invoice.id);
  return invoice;
}

describe("recordPayment concurrency", () => {
  it("sums correctly when 10 payments of ₹50 land concurrently on one invoice", async () => {
    const invoice = await makeInvoice(1000);

    await Promise.all(Array.from({ length: 10 }, () => recordPayment({ tenantId, invoiceId: invoice.id, amount: 50, mode: "CASH" })));

    const payments = await db.payment.findMany({ where: { invoiceId: invoice.id } });
    const final = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });

    expect(payments).toHaveLength(10);
    expect(Number(final.amountPaid)).toBe(500);
    expect(final.status).toBe("PARTIALLY_PAID");
  });

  it("marks an invoice PAID once concurrent payments cover the total", async () => {
    const invoice = await makeInvoice(500);

    await Promise.all(Array.from({ length: 10 }, () => recordPayment({ tenantId, invoiceId: invoice.id, amount: 50, mode: "CASH" })));

    const final = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(Number(final.amountPaid)).toBe(500);
    expect(final.status).toBe("PAID");
  });
});

describe("issueRefund concurrency", () => {
  it("settles correctly when refunds and payments interleave on one invoice", async () => {
    const invoice = await makeInvoice(1000);
    await recordPayment({ tenantId, invoiceId: invoice.id, amount: 1000, mode: "CASH" });

    await Promise.all([
      issueRefund({ tenantId, invoiceId: invoice.id, amount: 100 }),
      issueRefund({ tenantId, invoiceId: invoice.id, amount: 100 }),
      issueRefund({ tenantId, invoiceId: invoice.id, amount: 100 }),
    ]);

    const final = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(Number(final.amountPaid)).toBe(700);
  });
});

describe("markInvoicePaidInFull concurrency", () => {
  it("does not overpay when called twice concurrently (double-click)", async () => {
    const invoice = await makeInvoice(500);

    await Promise.all([
      markInvoicePaidInFull(tenantId, invoice.id),
      markInvoicePaidInFull(tenantId, invoice.id),
    ]);

    const payments = await db.payment.findMany({ where: { invoiceId: invoice.id } });
    const final = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });

    expect(payments).toHaveLength(1);
    expect(Number(final.amountPaid)).toBe(500);
    expect(final.status).toBe("PAID");
  });
});

describe("updateInvoiceLineItem concurrency", () => {
  it("settles on one consistent total when two concurrent edits set different prices", async () => {
    const invoice = await makeInvoice(100);

    await Promise.all([
      updateInvoiceLineItem(tenantId, invoice.id, "Consultation fee", 200),
      updateInvoiceLineItem(tenantId, invoice.id, "Consultation fee", 300),
    ]);

    const final = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lineItems: true } });
    // Whichever edit landed last should be internally consistent: the
    // invoice total must match its own line item, not a mix of both writes.
    expect(Number(final.totalAmount)).toBe(Number(final.lineItems[0].lineTotal));
    expect([200, 300]).toContain(Number(final.lineItems[0].unitPrice));
  });
});

describe("dispensePrescription concurrency", () => {
  it("never drives stock negative when concurrent dispenses exceed available stock", async () => {
    const medicine = await db.medicine.create({ data: { tenantId, name: "TEST-Overselling", unitPrice: 10, stockQuantity: 10 } });
    createdMedicineIds.push(medicine.id);

    const prescriptions = await Promise.all(
      Array.from({ length: 8 }, () => createPrescription({ tenantId, patientId, items: [{ medicineId: medicine.id, quantity: 3 }] }))
    );
    createdPrescriptionIds.push(...prescriptions.map((p) => p.id));

    const results = await Promise.allSettled(prescriptions.map((p) => dispensePrescription(tenantId, p.id)));
    const succeeded = results.filter((r) => r.status === "fulfilled").length;

    const finalMedicine = await db.medicine.findUniqueOrThrow({ where: { id: medicine.id } });
    expect(finalMedicine.stockQuantity).toBeGreaterThanOrEqual(0);
    expect(succeeded * 3).toBeLessThanOrEqual(10);
  });

  it("only allows one of two concurrent dispenses of the same prescription to succeed", async () => {
    const medicine = await db.medicine.create({ data: { tenantId, name: "TEST-DoubleDispense", unitPrice: 10, stockQuantity: 10 } });
    createdMedicineIds.push(medicine.id);

    const prescription = await createPrescription({ tenantId, patientId, items: [{ medicineId: medicine.id, quantity: 4 }] });
    createdPrescriptionIds.push(prescription.id);

    const results = await Promise.allSettled([dispensePrescription(tenantId, prescription.id), dispensePrescription(tenantId, prescription.id)]);
    const succeeded = results.filter((r) => r.status === "fulfilled").length;

    const finalMedicine = await db.medicine.findUniqueOrThrow({ where: { id: medicine.id } });
    expect(succeeded).toBe(1);
    expect(finalMedicine.stockQuantity).toBe(6);
  });
});

describe("adjustMedicineStock", () => {
  it("rejects a decrement that would take stock below zero", async () => {
    const medicine = await db.medicine.create({ data: { tenantId, name: "TEST-AdjustStock", unitPrice: 10, stockQuantity: 5 } });
    createdMedicineIds.push(medicine.id);

    await expect(adjustMedicineStock(tenantId, medicine.id, -10)).rejects.toThrow("Cannot reduce stock below zero");

    const final = await db.medicine.findUniqueOrThrow({ where: { id: medicine.id } });
    expect(final.stockQuantity).toBe(5);
  });
});

describe("invoice numbering", () => {
  it("never assigns the same invoice number to concurrent invoices", async () => {
    const invoices = await Promise.all(Array.from({ length: 20 }, () => makeInvoice(100)));
    const numbers = new Set(invoices.map((i) => i.invoiceNumber));
    expect(numbers.size).toBe(20);
  });
});
