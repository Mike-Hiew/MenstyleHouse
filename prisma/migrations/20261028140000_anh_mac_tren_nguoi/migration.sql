-- Ảnh mặc trên người (mục 5, giao diện v2): thẻ sản phẩm đổi sang ảnh này khi rê chuột.
ALTER TABLE "ProductImage" ADD COLUMN "onBody" BOOLEAN NOT NULL DEFAULT false;
