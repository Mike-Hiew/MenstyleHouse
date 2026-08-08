-- DropIndex
DROP INDEX "Invoice_number_key";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "issuedById" TEXT,
ADD COLUMN     "symbol" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "vatAddress" TEXT,
ADD COLUMN     "vatBuyerName" TEXT,
ADD COLUMN     "vatEmail" TEXT,
ADD COLUMN     "vatRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vatTaxCode" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_symbol_number_key" ON "Invoice"("symbol", "number");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

