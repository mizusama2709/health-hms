-- CreateEnum
CREATE TYPE "VitalsSource" AS ENUM ('IN_CLINIC', 'WHATSAPP');

-- CreateTable
CREATE TABLE "Vitals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "bp" TEXT,
    "glucose" DECIMAL(65,30),
    "weight" DECIMAL(65,30),
    "spo2" INTEGER,
    "source" "VitalsSource" NOT NULL DEFAULT 'IN_CLINIC',
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vitals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vitals_tenantId_patientId_recordedAt_idx" ON "Vitals"("tenantId", "patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "Vitals_appointmentId_idx" ON "Vitals"("appointmentId");

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
