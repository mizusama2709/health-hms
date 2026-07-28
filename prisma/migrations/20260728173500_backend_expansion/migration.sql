-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('MANUAL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('CONSULTATION', 'LAB', 'PHARMACY');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'CARD', 'UPI', 'RAZORPAY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "JourneyStep" AS ENUM ('APPOINTMENT_BOOKED', 'VITALS_TAKEN', 'OPD_STARTED', 'OPD_COMPLETED', 'LAB_ORDERED', 'LAB_COMPLETED', 'MEDICINES_PRESCRIBED', 'MEDICINES_DISPENSED');

-- CreateEnum
CREATE TYPE "WhatsAppDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('RECEIVED', 'PARSED', 'PROCESSED', 'FAILED', 'SENT', 'SIMULATED');

-- AlterEnum
BEGIN;
CREATE TYPE "InvoiceStatus_new" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID');
ALTER TABLE "public"."Invoice" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE "InvoiceStatus_new" USING ("status"::text::"InvoiceStatus_new");
ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";
DROP TYPE "public"."InvoiceStatus_old";
ALTER TABLE "Invoice" ALTER COLUMN "status" SET DEFAULT 'UNPAID';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'NURSE';
ALTER TYPE "Role" ADD VALUE 'RECEPTIONIST';
ALTER TYPE "Role" ADD VALUE 'LAB';
ALTER TYPE "Role" ADD VALUE 'PHARMACIST';

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_appointmentId_fkey";

-- DropIndex
DROP INDEX "Invoice_appointmentId_key";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "feeAmount" DECIMAL(65,30),
ADD COLUMN     "paymentMode" "PaymentMode",
ADD COLUMN     "serviceType" "ServiceType" NOT NULL DEFAULT 'CONSULTATION',
ADD COLUMN     "source" "AppointmentSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "FollowUp" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "reminderAt" TIMESTAMP(3),
ADD COLUMN     "reminderMessage" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "amount",
ADD COLUMN     "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceNumber" TEXT NOT NULL,
ADD COLUMN     "serviceType" "ServiceType" NOT NULL,
ADD COLUMN     "source" "AppointmentSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "subtotal" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "totalAmount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "appointmentId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "VisitRecord" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCESS',
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT,
    "refundedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientJourneyEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "step" "JourneyStep" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientJourneyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalName" TEXT,
    "gstNumber" TEXT,
    "companySize" TEXT,
    "hqAddressLine1" TEXT,
    "hqAddressLine2" TEXT,
    "hqCity" TEXT,
    "hqState" TEXT,
    "hqPostalCode" TEXT,
    "hqCountry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "defaultWorkingHours" JSONB,
    "bookingLeadTimeMinutes" INTEGER,
    "cancellationWindowMinutes" INTEGER,
    "bookingPolicyNotes" TEXT,
    "pharmacyGstNumber" TEXT,
    "paymentQrImageUrl" TEXT,
    "paymentUpiId" TEXT,
    "paymentPayeeName" TEXT,
    "razorpayPaymentLink" TEXT,
    "labUpiId" TEXT,
    "pharmacyUpiId" TEXT,
    "invoiceHeaderLogoUrl" TEXT,
    "invoiceHeaderText" TEXT,
    "pharmacyInvoiceTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HospitalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hospitalSettingsId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyReturn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceLineItemId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "quantityReturned" INTEGER NOT NULL,
    "refundAmount" DECIMAL(65,30),
    "reason" TEXT,
    "recordedById" TEXT,
    "returnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBaseDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeBaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "direction" "WhatsAppDirection" NOT NULL,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "fromPhone" TEXT,
    "toPhone" TEXT,
    "rawPayload" JSONB NOT NULL,
    "parsedIntent" TEXT,
    "relatedAppointmentId" TEXT,
    "relatedInvoiceId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_paidAt_idx" ON "Payment"("tenantId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_tenantId_status_idx" ON "Payment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Refund_tenantId_refundedAt_idx" ON "Refund"("tenantId", "refundedAt");

-- CreateIndex
CREATE INDEX "Refund_invoiceId_idx" ON "Refund"("invoiceId");

-- CreateIndex
CREATE INDEX "PatientJourneyEvent_tenantId_appointmentId_step_idx" ON "PatientJourneyEvent"("tenantId", "appointmentId", "step");

-- CreateIndex
CREATE INDEX "PatientJourneyEvent_tenantId_patientId_occurredAt_idx" ON "PatientJourneyEvent"("tenantId", "patientId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfile_tenantId_key" ON "OrganizationProfile"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalSettings_tenantId_key" ON "HospitalSettings"("tenantId");

-- CreateIndex
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");

-- CreateIndex
CREATE INDEX "PharmacyReturn_tenantId_returnedAt_idx" ON "PharmacyReturn"("tenantId", "returnedAt");

-- CreateIndex
CREATE INDEX "PharmacyReturn_invoiceId_idx" ON "PharmacyReturn"("invoiceId");

-- CreateIndex
CREATE INDEX "KnowledgeBaseDocument_tenantId_idx" ON "KnowledgeBaseDocument"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_relatedAppointmentId_key" ON "WhatsAppMessage"("relatedAppointmentId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_direction_status_idx" ON "WhatsAppMessage"("tenantId", "direction", "status");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_createdAt_idx" ON "WhatsAppMessage"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_datetime_idx" ON "Appointment"("tenantId", "datetime");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_status_idx" ON "Appointment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_doctorId_datetime_idx" ON "Appointment"("tenantId", "doctorId", "datetime");

-- CreateIndex
CREATE INDEX "Appointment_tenantId_source_idx" ON "Appointment"("tenantId", "source");

-- CreateIndex
CREATE INDEX "Doctor_tenantId_idx" ON "Doctor"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_serviceType_idx" ON "Invoice"("tenantId", "serviceType");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_createdAt_idx" ON "Invoice"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_source_idx" ON "Invoice"("tenantId", "source");

-- CreateIndex
CREATE INDEX "Patient_tenantId_idx" ON "Patient"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");

-- CreateIndex
CREATE INDEX "User_tenantId_status_idx" ON "User"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientJourneyEvent" ADD CONSTRAINT "PatientJourneyEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientJourneyEvent" ADD CONSTRAINT "PatientJourneyEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientJourneyEvent" ADD CONSTRAINT "PatientJourneyEvent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationProfile" ADD CONSTRAINT "OrganizationProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalSettings" ADD CONSTRAINT "HospitalSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_hospitalSettingsId_fkey" FOREIGN KEY ("hospitalSettingsId") REFERENCES "HospitalSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyReturn" ADD CONSTRAINT "PharmacyReturn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyReturn" ADD CONSTRAINT "PharmacyReturn_invoiceLineItemId_fkey" FOREIGN KEY ("invoiceLineItemId") REFERENCES "InvoiceLineItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBaseDocument" ADD CONSTRAINT "KnowledgeBaseDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_relatedAppointmentId_fkey" FOREIGN KEY ("relatedAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

