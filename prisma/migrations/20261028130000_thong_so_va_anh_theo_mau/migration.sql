-- Chip thông số dưới giá ở trang sản phẩm (mục 4, giao diện v2).
ALTER TABLE "Product" ADD COLUMN "specs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Ảnh theo màu: trống = dùng cho mọi màu.
ALTER TABLE "ProductImage" ADD COLUMN "color" TEXT;
