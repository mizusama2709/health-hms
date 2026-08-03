-- CreateEnum
CREATE TYPE "ImagingModality" AS ENUM ('XRAY', 'CT', 'MRI', 'ULTRASOUND');

-- CreateEnum
CREATE TYPE "ImagingOrderStatus" AS ENUM ('ORDERED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ImagingOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "orderedById" TEXT NOT NULL,
    "modality" "ImagingModality" NOT NULL,
    "description" TEXT,
    "status" "ImagingOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientConsentedAt" TIMESTAMP(3) NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "ImagingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagingStudy" (
    "id" TEXT NOT NULL,
    "imagingOrderId" TEXT NOT NULL,
    "studyInstanceUid" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImagingStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagingSeries" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "seriesInstanceUid" TEXT NOT NULL,
    "seriesNumber" INTEGER,
    "sliceThickness" DOUBLE PRECISION,
    "pixelSpacingX" DOUBLE PRECISION,
    "pixelSpacingY" DOUBLE PRECISION,
    "imageOrientationPatient" TEXT,

    CONSTRAINT "ImagingSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagingInstance" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "sopInstanceUid" TEXT NOT NULL,
    "instanceNumber" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImagingInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImagingOrder_tenantId_status_idx" ON "ImagingOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ImagingOrder_tenantId_patientId_idx" ON "ImagingOrder"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "ImagingStudy_imagingOrderId_idx" ON "ImagingStudy"("imagingOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ImagingSeries_studyId_seriesInstanceUid_key" ON "ImagingSeries"("studyId", "seriesInstanceUid");

-- CreateIndex
CREATE UNIQUE INDEX "ImagingInstance_sopInstanceUid_key" ON "ImagingInstance"("sopInstanceUid");

-- CreateIndex
CREATE INDEX "ImagingInstance_seriesId_idx" ON "ImagingInstance"("seriesId");

-- AddForeignKey
ALTER TABLE "ImagingOrder" ADD CONSTRAINT "ImagingOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingOrder" ADD CONSTRAINT "ImagingOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingOrder" ADD CONSTRAINT "ImagingOrder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingStudy" ADD CONSTRAINT "ImagingStudy_imagingOrderId_fkey" FOREIGN KEY ("imagingOrderId") REFERENCES "ImagingOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingSeries" ADD CONSTRAINT "ImagingSeries_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "ImagingStudy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingInstance" ADD CONSTRAINT "ImagingInstance_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ImagingSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
