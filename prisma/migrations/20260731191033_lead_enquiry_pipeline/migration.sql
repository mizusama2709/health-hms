-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('ENQUIRY', 'SYMPTOMS_COLLECTED', 'DOCTOR_RECOMMENDED', 'PAYMENT_PENDING', 'PAYMENT_COLLECTED', 'APPOINTMENT_BOOKED', 'FOLLOW_UP', 'CONVERTED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('MANUAL', 'WHATSAPP', 'IMPORT');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'ENQUIRY',
    "source" "LeadSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "convertedPatientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_tenantId_status_idx" ON "Lead"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
