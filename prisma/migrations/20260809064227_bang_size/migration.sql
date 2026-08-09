-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "sizeChartId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sizeChartId" TEXT;

-- CreateTable
CREATE TABLE "SizeChart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fit" TEXT NOT NULL DEFAULT '',
    "howTo" TEXT[],
    "columns" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeChartRow" (
    "id" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "values" TEXT[],
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SizeChartRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SizeChart_slug_key" ON "SizeChart"("slug");

-- CreateIndex
CREATE INDEX "SizeChartRow_chartId_sort_idx" ON "SizeChartRow"("chartId", "sort");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_sizeChartId_fkey" FOREIGN KEY ("sizeChartId") REFERENCES "SizeChart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sizeChartId_fkey" FOREIGN KEY ("sizeChartId") REFERENCES "SizeChart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SizeChartRow" ADD CONSTRAINT "SizeChartRow_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "SizeChart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
