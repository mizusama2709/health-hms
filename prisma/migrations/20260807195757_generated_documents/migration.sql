-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "invoiceId" TEXT,
    "prescriptionId" TEXT,
    "visitRecordId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "pdfData" BYTEA NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedDocument_tenantId_type_idx" ON "GeneratedDocument"("tenantId", "type");

-- CreateIndex
CREATE INDEX "GeneratedDocument_type_invoiceId_idx" ON "GeneratedDocument"("type", "invoiceId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_type_prescriptionId_idx" ON "GeneratedDocument"("type", "prescriptionId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_type_visitRecordId_idx" ON "GeneratedDocument"("type", "visitRecordId");
