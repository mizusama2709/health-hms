-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WhatsAppMessageStatus" ADD VALUE 'DELIVERED';
ALTER TYPE "WhatsAppMessageStatus" ADD VALUE 'READ';

-- AlterTable
ALTER TABLE "WhatsAppMessage" ADD COLUMN     "providerMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_providerMessageId_key" ON "WhatsAppMessage"("providerMessageId");
