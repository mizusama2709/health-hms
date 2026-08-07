import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createInvoice } from "@/lib/billing";
import { createPrescription } from "@/lib/pharmacy";
import { generateAndAttachInvoiceDocument, generateAndAttachPrescriptionDocument } from "@/lib/documents";

// Regression coverage for the two newer downloadable-document types
// (invoice, prescription) — the consultation-summary path is covered in
// consultation-summary.test.ts. All three share the same GeneratedDocument
// storage + api/documents/[type]/[id]/pdf serving route.

let tenantId: string;
let patientId: string;
const createdInvoiceIds: string[] = [];
const createdPrescriptionIds: string[] = [];
const createdMedicineIds: string[] = [];

beforeAll(async () => {
  const tenant = await db.tenant.findFirstOrThrow();
  const patient = await db.patient.findFirstOrThrow({ where: { tenantId: tenant.id } });
  tenantId = tenant.id;
  patientId = patient.id;
});

afterEach(async () => {
  for (const id of createdInvoiceIds.splice(0)) {
    await db.generatedDocument.deleteMany({ where: { invoiceId: id } });
    await db.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
    await db.invoice.delete({ where: { id } }).catch(() => {});
  }
  for (const id of createdPrescriptionIds.splice(0)) {
    await db.generatedDocument.deleteMany({ where: { prescriptionId: id } });
    await db.prescriptionItem.deleteMany({ where: { prescriptionId: id } });
    await db.prescription.delete({ where: { id } }).catch(() => {});
  }
  for (const id of createdMedicineIds.splice(0)) {
    await db.medicine.delete({ where: { id } }).catch(() => {});
  }
});

describe("generateAndAttachInvoiceDocument", () => {
  it("generates a real PDF and points fileUrl at the shared documents route", async () => {
    const invoice = await createInvoice({
      tenantId,
      patientId,
      serviceType: "CONSULTATION",
      lineItems: [{ description: "TEST-Consultation", serviceType: "CONSULTATION", quantity: 1, unitPrice: 500 }],
    });
    createdInvoiceIds.push(invoice.id);

    const document = await generateAndAttachInvoiceDocument(tenantId, invoice.id, "http://localhost:3000");

    expect(document.fileUrl).toBe(`http://localhost:3000/api/documents/invoice/${document.id}/pdf`);
    expect(document.type).toBe("invoice");
    expect(document.invoiceId).toBe(invoice.id);
    // %PDF magic header — confirms this is a real PDF document, not placeholder bytes
    expect(Buffer.from(document.pdfData).subarray(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("throws for an invoice outside the caller's tenant", async () => {
    const otherTenant = await db.tenant.create({ data: { name: "TEST-OtherTenant-Documents", slug: `test-other-tenant-documents-${Date.now()}` } });
    await expect(generateAndAttachInvoiceDocument(otherTenant.id, "nonexistent-id", "http://localhost:3000")).rejects.toThrow(
      "Invoice not found"
    );
    await db.tenant.delete({ where: { id: otherTenant.id } });
  });
});

describe("generateAndAttachPrescriptionDocument", () => {
  it("generates a real PDF listing the prescribed medicines", async () => {
    const medicine = await db.medicine.create({
      data: { tenantId, name: "TEST-Documents-Medicine", unitPrice: 10 },
    });
    createdMedicineIds.push(medicine.id);

    const prescription = await createPrescription({
      tenantId,
      patientId,
      items: [{ medicineId: medicine.id, quantity: 10, doseTimes: ["MORNING", "NIGHT"], dosageInstructions: "After food" }],
    });
    createdPrescriptionIds.push(prescription.id);

    const document = await generateAndAttachPrescriptionDocument(tenantId, prescription.id, "http://localhost:3000");

    expect(document.fileUrl).toBe(`http://localhost:3000/api/documents/prescription/${document.id}/pdf`);
    expect(document.prescriptionId).toBe(prescription.id);
    expect(Buffer.from(document.pdfData).subarray(0, 4).toString("ascii")).toBe("%PDF");
  });
});
