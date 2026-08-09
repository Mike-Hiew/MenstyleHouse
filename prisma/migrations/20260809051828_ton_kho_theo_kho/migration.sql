-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "isMain" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StockLevel" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockLevel_warehouseId_idx" ON "StockLevel"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "StockLevel_variantId_warehouseId_key" ON "StockLevel"("variantId", "warehouseId");

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Chuyển tồn hiện có vào kho chính.
--
-- Không có bước này thì tổng theo kho bằng 0 trong khi `Variant.stock` khác 0 —
-- màn tồn kho hiện đúng, màn theo kho hiện rỗng, và không có gì báo lệch.
--
-- Kho chính: kho đầu tiên theo tên. Chưa có kho nào (DB trắng, seed chạy sau)
-- thì bỏ qua, seed sẽ tự đánh dấu.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE "Warehouse" SET "isMain" = true
WHERE id = (SELECT id FROM "Warehouse" ORDER BY name ASC LIMIT 1);

INSERT INTO "StockLevel" (id, "variantId", "warehouseId", qty)
SELECT
  md5(random()::text || v.id)::text,
  v.id,
  (SELECT id FROM "Warehouse" WHERE "isMain" LIMIT 1),
  v.stock
FROM "Variant" v
WHERE EXISTS (SELECT 1 FROM "Warehouse" WHERE "isMain")
ON CONFLICT ("variantId", "warehouseId") DO NOTHING;

UPDATE "InventoryMovement"
SET "warehouseId" = (SELECT id FROM "Warehouse" WHERE "isMain" LIMIT 1)
WHERE "warehouseId" IS NULL
  AND EXISTS (SELECT 1 FROM "Warehouse" WHERE "isMain");
