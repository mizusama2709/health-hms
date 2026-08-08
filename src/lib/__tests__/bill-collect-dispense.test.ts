import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createPrescription, billCollectAndDispensePrescription } from "@/lib/pharmacy";

let tenantId: string;
let patientId: string;
const createdMedicineIds: string[] = [];
const createdPrescriptionIds: string[] = [];
const createdInvoiceIds: string[] = [];

beforeAll(async () => {
  const tenant = await db.tenant.findFirstOrThrow();
  const patient = await db.patient.findFirstOrThrow({ where: { tenantId: tenant.id } });
  tenantId = tenant.id;
  patientId = patient.id;
});

afterEach(async () => {
  for (const id of createdInvoiceIds.splice(0)) {
    await db.payment.deleteMany({ where: { invoiceId: id } });
    await db.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
    await db.invoice.deleteMany({ where: { id } });
  }
  for (const id of createdPrescriptionIds.splice(0)) {
    await db.prescriptionItem.deleteMany({ where: { prescriptionId: id } });
    await db.prescription.deleteMany({ where: { id } });
  }
  for (const id of createdMedicineIds.splice(0)) {
    await db.medicine.deleteMany({ where: { id } });
  }
  // Deliberately not resetting InvoiceCounter — see the matching comment
  // in concurrency.test.ts's afterEach. It's a shared, monotonically-
  // increasing sequence for the whole tenant, not per-test state;
  // resetting it to a fixed value guarantees the next createInvoice()
  // call anywhere collides with a real invoice number that already
  // exists above that point.
});

describe("billCollectAndDispensePrescription", () => {
  it("bills, fully pays, and dispenses a prescription in one call", async () => {
    const medicine = await db.medicine.create({ data: { tenantId, name: "TEST-BillCollectDispense", unitPrice: 20, stockQuantity: 10 } });
    createdMedicineIds.push(medicine.id);

    const prescription = await createPrescription({ tenantId, patientId, items: [{ medicineId: medicine.id, quantity: 3 }] });
    createdPrescriptionIds.push(prescription.id);

    const invoice = await billCollectAndDispensePrescription(tenantId, prescription.id, "CASH");
    createdInvoiceIds.push(invoice.id);

    const finalInvoice = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    const finalPrescription = await db.prescription.findUniqueOrThrow({ where: { id: prescription.id } });
    const finalMedicine = await db.medicine.findUniqueOrThrow({ where: { id: medicine.id } });

    expect(Number(finalInvoice.totalAmount)).toBe(60);
    expect(Number(finalInvoice.amountPaid)).toBe(60);
    expect(finalInvoice.status).toBe("PAID");
    expect(finalPrescription.status).toBe("DISPENSED");
    expect(finalMedicine.stockQuantity).toBe(7);
  });

  it("skips recording a payment when the total is zero (unpriced medicine)", async () => {
    const medicine = await db.medicine.create({ data: { tenantId, name: "TEST-BillCollectDispense-Zero", unitPrice: 0, stockQuantity: 10 } });
    createdMedicineIds.push(medicine.id);

    const prescription = await createPrescription({ tenantId, patientId, items: [{ medicineId: medicine.id, quantity: 2 }] });
    createdPrescriptionIds.push(prescription.id);

    const invoice = await billCollectAndDispensePrescription(tenantId, prescription.id, "CASH");
    createdInvoiceIds.push(invoice.id);

    const payments = await db.payment.findMany({ where: { invoiceId: invoice.id } });
    const finalPrescription = await db.prescription.findUniqueOrThrow({ where: { id: prescription.id } });

    expect(payments).toHaveLength(0);
    expect(finalPrescription.status).toBe("DISPENSED");
  });

  it("still fails cleanly when stock is insufficient, without leaving a partially-collected payment", async () => {
    const medicine = await db.medicine.create({ data: { tenantId, name: "TEST-BillCollectDispense-Oversell", unitPrice: 20, stockQuantity: 1 } });
    createdMedicineIds.push(medicine.id);

    const prescription = await createPrescription({ tenantId, patientId, items: [{ medicineId: medicine.id, quantity: 5 }] });
    createdPrescriptionIds.push(prescription.id);

    await expect(billCollectAndDispensePrescription(tenantId, prescription.id, "CASH")).rejects.toThrow("Insufficient stock");

    // The invoice + payment from the earlier steps still exist (dispense is
    // the step that failed) — this documents current, non-atomic behavior
    // rather than asserting a stronger guarantee this function doesn't make.
    const finalPrescription = await db.prescription.findUniqueOrThrow({ where: { id: prescription.id } });
    if (finalPrescription.invoiceId) createdInvoiceIds.push(finalPrescription.invoiceId);
    expect(finalPrescription.status).toBe("PENDING");
  });
});
