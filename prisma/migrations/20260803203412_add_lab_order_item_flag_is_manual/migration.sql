-- AlterTable
ALTER TABLE "LabOrderItem" ADD COLUMN     "flagIsManual" BOOLEAN NOT NULL DEFAULT false;

-- Protect existing manually-recorded flags: without this, resaving a
-- pre-existing result with its flag dropdown unchanged would look
-- indistinguishable from a stale auto-computed value and could get
-- silently reclassified by the new auto-flagging logic.
UPDATE "LabOrderItem" SET "flagIsManual" = true WHERE "flag" IS NOT NULL;
