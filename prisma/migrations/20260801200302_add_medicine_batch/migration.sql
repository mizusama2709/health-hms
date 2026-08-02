-- CreateTable
CREATE TABLE "MedicineBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "batchNo" TEXT,
    "manufacturer" TEXT,
    "genericName" TEXT,
    "receivedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "openingStock" INTEGER NOT NULL DEFAULT 0,
    "billedQty" INTEGER NOT NULL DEFAULT 0,
    "availableQty" INTEGER NOT NULL DEFAULT 0,
    "packSize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicineBatch_tenantId_medicineId_idx" ON "MedicineBatch"("tenantId", "medicineId");

-- CreateIndex
CREATE INDEX "MedicineBatch_tenantId_expiryDate_idx" ON "MedicineBatch"("tenantId", "expiryDate");

-- AddForeignKey
ALTER TABLE "MedicineBatch" ADD CONSTRAINT "MedicineBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineBatch" ADD CONSTRAINT "MedicineBatch_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
