-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'ESCALATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FollowUpOutcome" AS ENUM ('IMPROVING', 'NO_CHANGE', 'WORSENING', 'ADVERSE_REACTION', 'RESOLVED', 'UNREACHABLE');

-- CreateEnum
CREATE TYPE "FollowUpNextAction" AS ENUM ('NONE', 'ANOTHER_CALL_SCHEDULED', 'BOOK_APPOINTMENT', 'ESCALATE_TO_DOCTOR');

-- AlterTable: add new columns as nullable first, so the 1 pre-existing row doesn't block the migration
ALTER TABLE "FollowUp"
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "focusInstructions" TEXT,
  ADD COLUMN "prescribedById" TEXT;

-- Backfill existing row(s) from the linked Appointment
UPDATE "FollowUp" f
SET "tenantId" = a."tenantId"
FROM "Appointment" a
WHERE a.id = f."appointmentId" AND f."tenantId" IS NULL;

UPDATE "FollowUp"
SET "focusInstructions" = 'Legacy follow-up — no instructions recorded'
WHERE "focusInstructions" IS NULL;

-- Now safe to enforce NOT NULL
ALTER TABLE "FollowUp"
  ALTER COLUMN "tenantId" SET NOT NULL,
  ALTER COLUMN "focusInstructions" SET NOT NULL;

-- Convert status from free-text to the new enum, mapping old values
ALTER TABLE "FollowUp" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "FollowUp" ALTER COLUMN "status" TYPE "FollowUpStatus" USING (
  CASE "status"
    WHEN 'pending' THEN 'PENDING'
    WHEN 'done' THEN 'COMPLETED'
    WHEN 'cancelled' THEN 'CANCELLED'
    ELSE 'PENDING'
  END
)::"FollowUpStatus";
ALTER TABLE "FollowUp" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "FollowUp_tenantId_status_idx" ON "FollowUp"("tenantId", "status");
CREATE INDEX "FollowUp_tenantId_dueDate_idx" ON "FollowUp"("tenantId", "dueDate");

-- CreateTable
CREATE TABLE "FollowUpCallLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "calledById" TEXT NOT NULL,
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "FollowUpOutcome" NOT NULL,
    "notes" TEXT NOT NULL,
    "nextAction" "FollowUpNextAction" NOT NULL DEFAULT 'NONE',
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUpCallLog_tenantId_outcome_idx" ON "FollowUpCallLog"("tenantId", "outcome");
CREATE INDEX "FollowUpCallLog_tenantId_calledAt_idx" ON "FollowUpCallLog"("tenantId", "calledAt");

-- AddForeignKey
ALTER TABLE "FollowUpCallLog" ADD CONSTRAINT "FollowUpCallLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpCallLog" ADD CONSTRAINT "FollowUpCallLog_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
