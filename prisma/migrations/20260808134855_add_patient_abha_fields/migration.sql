-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "abhaAddress" TEXT,
ADD COLUMN     "abhaNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Patient_abhaNumber_key" ON "Patient"("abhaNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_abhaAddress_key" ON "Patient"("abhaAddress");
