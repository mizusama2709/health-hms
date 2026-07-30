-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "cgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "sgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InvoiceLineItem" ADD COLUMN     "taxRatePercent" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "taxRatePercent" DECIMAL(65,30) NOT NULL DEFAULT 0;
