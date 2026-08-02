-- AlterTable
ALTER TABLE "LabOrder" ADD COLUMN     "followUpId" TEXT;

-- CreateIndex
CREATE INDEX "LabOrder_followUpId_idx" ON "LabOrder"("followUpId");

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
