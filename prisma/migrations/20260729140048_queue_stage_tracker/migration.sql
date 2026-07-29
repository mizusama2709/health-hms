-- CreateEnum
CREATE TYPE "QueueStage" AS ENUM ('REGISTRATION', 'VITALS', 'CONSULTATION', 'LAB', 'CONSULTATION_2', 'PHARMACY');

-- CreateTable
CREATE TABLE "QueueStageEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "stage" "QueueStage" NOT NULL,
    "assignedToId" TEXT,
    "remark" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueStageEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueStageConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stage" "QueueStage" NOT NULL,
    "turnaroundMinutes" INTEGER NOT NULL DEFAULT 15,

    CONSTRAINT "QueueStageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QueueStageEntry_tenantId_appointmentId_idx" ON "QueueStageEntry"("tenantId", "appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueStageEntry_appointmentId_stage_key" ON "QueueStageEntry"("appointmentId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "QueueStageConfig_tenantId_stage_key" ON "QueueStageConfig"("tenantId", "stage");

-- AddForeignKey
ALTER TABLE "QueueStageEntry" ADD CONSTRAINT "QueueStageEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueStageEntry" ADD CONSTRAINT "QueueStageEntry_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueStageEntry" ADD CONSTRAINT "QueueStageEntry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueStageConfig" ADD CONSTRAINT "QueueStageConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
