-- CreateTable
CREATE TABLE "RxTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "diseaseTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RxTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RxTemplateItem" (
    "id" TEXT NOT NULL,
    "rxTemplateId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dosageInstructions" TEXT,

    CONSTRAINT "RxTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RxTemplate_tenantId_idx" ON "RxTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "RxTemplateItem_rxTemplateId_idx" ON "RxTemplateItem"("rxTemplateId");

-- AddForeignKey
ALTER TABLE "RxTemplate" ADD CONSTRAINT "RxTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxTemplateItem" ADD CONSTRAINT "RxTemplateItem_rxTemplateId_fkey" FOREIGN KEY ("rxTemplateId") REFERENCES "RxTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RxTemplateItem" ADD CONSTRAINT "RxTemplateItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
