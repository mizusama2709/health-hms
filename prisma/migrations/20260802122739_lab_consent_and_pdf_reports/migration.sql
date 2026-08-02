-- AlterTable: add nullable first so the 2 pre-existing rows don't block it
ALTER TABLE "LabOrder" ADD COLUMN "patientConsentedAt" TIMESTAMP(3);

-- Backfill: legacy orders predate this feature, so we can't know the real
-- consent time — use orderedAt as the closest honest approximation.
UPDATE "LabOrder" SET "patientConsentedAt" = "orderedAt" WHERE "patientConsentedAt" IS NULL;

ALTER TABLE "LabOrder" ALTER COLUMN "patientConsentedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "LabReport" ADD COLUMN "pdfData" BYTEA;
