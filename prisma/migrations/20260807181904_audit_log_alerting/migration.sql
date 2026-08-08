-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "alertedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AuditLog_action_alertedAt_idx" ON "AuditLog"("action", "alertedAt");
