-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('PATIENT', 'DOCTOR', 'STAFF');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "cancelledBy" "CancelledBy";
