-- CreateTable
CREATE TABLE "StoreSetting" (
    "id" TEXT NOT NULL DEFAULT 'cua-hang',
    "shopName" TEXT NOT NULL,
    "taxCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "hotline" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankAccount" TEXT NOT NULL,
    "bankOwner" TEXT NOT NULL,
    "shipInnerCity" INTEGER NOT NULL,
    "shipProvince" INTEGER NOT NULL,
    "freeShipFrom" INTEGER NOT NULL,
    "vatRate" INTEGER NOT NULL,
    "holdMinutes" INTEGER NOT NULL,
    "tierSilver" INTEGER NOT NULL,
    "tierGold" INTEGER NOT NULL,
    "tierDiamond" INTEGER NOT NULL,
    "payCod" BOOLEAN NOT NULL DEFAULT true,
    "payBank" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);


-- Dòng cài đặt đầu tiên, lấy đúng những giá trị đang hardcode trong mã trước
-- migration này. Nhờ vậy chạy migration xong hệ thống hành xử **y hệt** — đổi
-- hành vi là việc của người bấm Lưu, không phải tác dụng phụ của việc nâng cấp.
INSERT INTO "StoreSetting" (
  "id", "shopName", "taxCode", "address", "hotline", "email",
  "bankName", "bankAccount", "bankOwner",
  "shipInnerCity", "shipProvince", "freeShipFrom", "vatRate", "holdMinutes",
  "tierSilver", "tierGold", "tierDiamond", "payCod", "payBank", "updatedAt"
) VALUES (
  'cua-hang',
  'Công ty TNHH Men Style House',
  '0316998221',
  '142 Nguyễn Văn Trỗi, P.8, Q. Phú Nhuận, TP.HCM',
  '1900 6060',
  'cskh@menstylehouse.vn',
  'Vietcombank — CN Tân Bình',
  '0071 0009 8877',
  'CTY TNHH MEN STYLE HOUSE',
  22000, 35000, 500000, 8, 120,
  800000, 2000000, 4000000, true, true, NOW()
);
