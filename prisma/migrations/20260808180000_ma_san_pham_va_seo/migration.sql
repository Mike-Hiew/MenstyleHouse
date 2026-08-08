-- Mã sản phẩm + hai ô SEO.
--
-- Bản `migrate diff` sinh ra thêm thẳng `code TEXT NOT NULL`, thứ luôn chết trên
-- bảng đã có dữ liệu. Nên viết tay: thêm cột cho phép rỗng, điền dữ liệu, rồi
-- mới siết ràng buộc.

ALTER TABLE "Product" ADD COLUMN "code" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoDescription" TEXT;

-- Seed nhét sẵn mã vào tên ("Hoodie cổ tròn MSH-136") và SKU đang dựng từ mã đó,
-- nên lấy lại đúng nó thì SKU cũ vẫn khớp tiền tố của sản phẩm.
UPDATE "Product" SET "code" = substring("name" from 'MSH-[0-9]+');

-- Sản phẩm nào tên không mang mã thì cấp mã mới, đánh tiếp sau số lớn nhất đang
-- có. Không đánh lại từ 1: mã trùng mã cũ sẽ làm SKU mới đụng SKU đã in ra tem.
WITH moc AS (
  SELECT COALESCE(MAX(CAST(split_part("code", '-', 2) AS INTEGER)), 100) AS so
  FROM "Product"
  WHERE "code" ~ '^MSH-[0-9]+$'
), thieu AS (
  SELECT id, row_number() OVER (ORDER BY "createdAt", id) AS n
  FROM "Product"
  WHERE "code" IS NULL
)
UPDATE "Product" p
SET "code" = 'MSH-' || (moc.so + thieu.n)
FROM thieu, moc
WHERE p.id = thieu.id;

ALTER TABLE "Product" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
