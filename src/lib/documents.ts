import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/db";
import { decryptPHIMaybe } from "@/lib/phiCrypto";

async function pageWithFonts() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  const left = 50;
  const draw = (text: string, opts: { size?: number; f?: typeof font; color?: ReturnType<typeof rgb> } = {}) => {
    page.drawText(text, { x: left, y, size: opts.size ?? 11, font: opts.f ?? font, color: opts.color ?? rgb(0, 0, 0) });
    y -= (opts.size ?? 11) + 8;
  };
  return { doc, page, font, bold, draw, gap: (n: number) => (y -= n) };
}

function formatINR(value: number) {
  return `Rs. ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---- Invoice ----

type InvoiceForDocument = NonNullable<Awaited<ReturnType<typeof loadInvoiceForDocument>>>;

async function loadInvoiceForDocument(tenantId: string, invoiceId: string) {
  return db.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: { lineItems: true, patient: { include: { user: true } } },
  });
}

export async function generateInvoicePdf(invoice: InvoiceForDocument): Promise<Uint8Array> {
  const { doc, bold, draw, gap } = await pageWithFonts();

  draw("Invoice", { size: 20, f: bold });
  gap(6);
  draw(`Invoice #: ${invoice.invoiceNumber}`, { f: bold });
  draw(`Patient: ${invoice.patient.user.name}`);
  draw(`Date: ${invoice.createdAt.toLocaleDateString()}`);
  draw(`Status: ${invoice.status}`);
  gap(10);

  draw("Line items", { f: bold });
  for (const item of invoice.lineItems) {
    draw(`${item.description}  x${item.quantity}  @ ${formatINR(Number(item.unitPrice))} = ${formatINR(Number(item.lineTotal))}`);
  }
  gap(10);

  draw(`Subtotal: ${formatINR(Number(invoice.subtotal))}`);
  if (Number(invoice.discountAmount) > 0) draw(`Discount: -${formatINR(Number(invoice.discountAmount))}`);
  const gst = Number(invoice.cgstAmount) + Number(invoice.sgstAmount);
  if (gst > 0) draw(`GST: ${formatINR(gst)}`);
  draw(`Total: ${formatINR(Number(invoice.totalAmount))}`, { f: bold });
  draw(`Paid: ${formatINR(Number(invoice.amountPaid))}`);
  const balance = Number(invoice.totalAmount) - Number(invoice.amountPaid);
  draw(`Balance due: ${formatINR(balance)}`, { color: balance > 0 ? rgb(0.75, 0.45, 0) : rgb(0, 0.5, 0) });

  return doc.save();
}

export async function generateAndAttachInvoiceDocument(tenantId: string, invoiceId: string, baseUrl: string) {
  const invoice = await loadInvoiceForDocument(tenantId, invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  const pdfBytes = await generateInvoicePdf(invoice);
  return storeAndLinkDocument(tenantId, "invoice", { invoiceId }, pdfBytes, baseUrl);
}

// ---- Prescription ----

type PrescriptionForDocument = NonNullable<Awaited<ReturnType<typeof loadPrescriptionForDocument>>>;

async function loadPrescriptionForDocument(tenantId: string, prescriptionId: string) {
  return db.prescription.findFirst({
    where: { id: prescriptionId, tenantId },
    include: { patient: { include: { user: true } }, items: { include: { medicine: true } } },
  });
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export async function generatePrescriptionPdf(prescription: PrescriptionForDocument): Promise<Uint8Array> {
  const { doc, bold, draw, gap } = await pageWithFonts();

  draw("Prescription", { size: 20, f: bold });
  gap(6);
  draw(`Patient: ${prescription.patient.user.name}`, { f: bold });
  draw(`Date: ${prescription.createdAt.toLocaleDateString()}`);
  gap(10);

  for (const item of prescription.items) {
    const doseTimes = item.doseTimes.map(titleCase).join(", ") || "as needed";
    const duration =
      item.durationValue && item.durationUnit ? ` for ${item.durationValue} ${titleCase(item.durationUnit)}` : "";
    const note = item.dosageInstructions ? ` (${item.dosageInstructions})` : "";
    draw(`${item.medicine.name} x${item.quantity} — ${doseTimes}${duration}${note}`);
  }

  return doc.save();
}

export async function generateAndAttachPrescriptionDocument(tenantId: string, prescriptionId: string, baseUrl: string) {
  const prescription = await loadPrescriptionForDocument(tenantId, prescriptionId);
  if (!prescription) throw new Error("Prescription not found");

  const pdfBytes = await generatePrescriptionPdf(prescription);
  return storeAndLinkDocument(tenantId, "prescription", { prescriptionId }, pdfBytes, baseUrl);
}

// ---- Consultation summary ----

type VisitRecordForDocument = NonNullable<Awaited<ReturnType<typeof loadVisitRecordForDocument>>>;

async function loadVisitRecordForDocument(tenantId: string, appointmentId: string) {
  return db.visitRecord.findFirst({
    where: { appointmentId, appointment: { tenantId } },
    include: { appointment: { include: { patient: { include: { user: true } }, doctor: { include: { user: true } } } } },
  });
}

// Same notes/diagnosis/prescription split as sendConsultationSummaryViaWhatsApp
// in lib/whatsapp.ts — VisitRecord.notes is the doctor's internal working
// notes and never belongs in a patient-facing document.
export async function generateConsultationSummaryPdf(visitRecord: VisitRecordForDocument): Promise<Uint8Array> {
  const { doc, bold, draw, gap } = await pageWithFonts();
  const { patient, doctor, datetime } = visitRecord.appointment;
  const diagnosis = decryptPHIMaybe(visitRecord.diagnosis);
  const treatmentPlan = decryptPHIMaybe(visitRecord.prescription);

  draw("Consultation Summary", { size: 20, f: bold });
  gap(6);
  draw(`Patient: ${patient.user.name}`, { f: bold });
  draw(`Seen by: Dr. ${doctor.user.name}`);
  draw(`Date: ${datetime.toLocaleDateString()}`);
  gap(10);

  if (diagnosis) {
    draw("Diagnosis", { f: bold });
    draw(diagnosis);
    gap(6);
  }
  if (treatmentPlan) {
    draw("Care plan", { f: bold });
    draw(treatmentPlan);
  }

  return doc.save();
}

export async function generateAndAttachConsultationSummaryDocument(tenantId: string, appointmentId: string, baseUrl: string) {
  const visitRecord = await loadVisitRecordForDocument(tenantId, appointmentId);
  if (!visitRecord) throw new Error("Visit record not found");

  const pdfBytes = await generateConsultationSummaryPdf(visitRecord);
  return storeAndLinkDocument(tenantId, "consultation_summary", { visitRecordId: visitRecord.id }, pdfBytes, baseUrl);
}

// ---- shared storage ----

async function storeAndLinkDocument(
  tenantId: string,
  type: "invoice" | "prescription" | "consultation_summary",
  relation: { invoiceId?: string; prescriptionId?: string; visitRecordId?: string },
  pdfBytes: Uint8Array,
  baseUrl: string
) {
  const created = await db.generatedDocument.create({
    data: { tenantId, type, ...relation, fileUrl: "", pdfData: Buffer.from(pdfBytes) },
  });

  return db.generatedDocument.update({
    where: { id: created.id },
    data: { fileUrl: `${baseUrl}/api/documents/${type}/${created.id}/pdf` },
  });
}
