-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permission" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permission_key" ON "RolePermission"("role", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvite_token_key" ON "StaffInvite"("token");

-- CreateIndex
CREATE INDEX "StaffInvite_email_status_idx" ON "StaffInvite"("email", "status");

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Ma trận mặc định: chép đúng những gì đang viết cứng trong mã trước migration
-- này. Chạy xong hệ thống phân quyền y hệt hôm qua — đổi quyền là việc của
-- người bấm tick, không phải tác dụng phụ của việc nâng cấp.
--
-- ADMIN cố ý KHÔNG có dòng nào: chủ cửa hàng luôn có mọi khả năng, chốt trong
-- mã chứ không phải dữ liệu sửa được.
INSERT INTO "RolePermission" ("id", "role", "permission") VALUES
  (gen_random_uuid()::text, 'STAFF', 'don.xem'),
  (gen_random_uuid()::text, 'STAFF', 'don.doi-trang-thai'),
  (gen_random_uuid()::text, 'STAFF', 'don.van-chuyen'),
  (gen_random_uuid()::text, 'STAFF', 'san-pham.xem'),
  (gen_random_uuid()::text, 'STAFF', 'san-pham.sua'),
  (gen_random_uuid()::text, 'STAFF', 'kho.xem'),
  (gen_random_uuid()::text, 'STAFF', 'khach-hang.xem'),
  (gen_random_uuid()::text, 'STAFF', 'khach-hang.tao'),
  (gen_random_uuid()::text, 'STAFF', 'ho-tro.tra-loi'),

  (gen_random_uuid()::text, 'WAREHOUSE', 'kho.xem'),
  (gen_random_uuid()::text, 'WAREHOUSE', 'kho.ghi-so'),
  (gen_random_uuid()::text, 'WAREHOUSE', 'san-pham.xem'),
  (gen_random_uuid()::text, 'WAREHOUSE', 'don.xem'),

  (gen_random_uuid()::text, 'ACCOUNTANT', 'hoa-don.xem'),
  (gen_random_uuid()::text, 'ACCOUNTANT', 'hoa-don.phat-hanh'),
  (gen_random_uuid()::text, 'ACCOUNTANT', 'thanh-toan.xac-nhan'),
  (gen_random_uuid()::text, 'ACCOUNTANT', 'bao-cao.xem'),
  (gen_random_uuid()::text, 'ACCOUNTANT', 'don.xem'),
  (gen_random_uuid()::text, 'ACCOUNTANT', 'kho.xem');
