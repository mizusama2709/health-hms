-- AlterTable
ALTER TABLE "FollowUp" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WhatsAppMessage" ADD COLUMN     "relatedFollowUpId" TEXT;

-- CreateIndex
CREATE INDEX "FollowUp_tenantId_reminderScheduled_reminderSentAt_reminder_idx" ON "FollowUp"("tenantId", "reminderScheduled", "reminderSentAt", "reminderAt");
