-- CreateEnum
CREATE TYPE "DoseTime" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS');

-- AlterTable
ALTER TABLE "PrescriptionItem" ADD COLUMN     "doseTimes" "DoseTime"[],
ADD COLUMN     "durationUnit" "DurationUnit",
ADD COLUMN     "durationValue" INTEGER;
