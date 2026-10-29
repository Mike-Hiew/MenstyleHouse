-- Đánh giá mức hài lòng cho yêu cầu hỗ trợ.
--
-- Chỉ thêm cột cho phép NULL: yêu cầu cũ coi như chưa được chấm, không phải
-- viết lại dòng nào. Khoảng 1–5 chặn luôn ở DB — form và server action đã
-- kiểm, nhưng số liệu "Hài lòng" ở admin đọc thẳng từ cột này, một dòng 50/5
-- lọt vào là cả trung bình sai.

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "rating" INTEGER,
ADD COLUMN "ratingNote" TEXT,
ADD COLUMN "ratedAt" TIMESTAMP(3);

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_rating_range" CHECK ("rating" IS NULL OR ("rating" BETWEEN 1 AND 5));

-- CreateIndex
CREATE INDEX "Ticket_ratedAt_idx" ON "Ticket"("ratedAt");
