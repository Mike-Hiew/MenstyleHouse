-- ─────────────────────────────────────────────────────────────────────────────
-- `Role` từ enum thành bảng.
--
-- Trước đây thêm một vai trò phải sửa schema, chạy migration và triển khai lại.
-- Thành bảng thì đó là việc bấm chuột.
--
-- HAI ĐIỀU PHẢI CẨN THẬN Ở MIGRATION NÀY
--
-- 1. **Không được mất vai trò của ai.** DDL mà `prisma migrate diff` sinh ra làm
--    `DROP COLUMN "role"` rồi `ADD COLUMN` — chạy cái đó là mọi người dùng về
--    `CUSTOMER`, kể cả chủ cửa hàng, và không còn ai vào được khu quản trị để
--    sửa lại. Ở đây dùng `ALTER COLUMN ... TYPE TEXT USING role::text`, giữ
--    nguyên từng giá trị.
--
-- 2. **Bảng và kiểu không được trùng tên trong Postgres.** Bảng mới cũng tên
--    `Role`, nên phải đổi ba cột sang TEXT rồi `DROP TYPE "Role"` xong mới tạo
--    bảng được. Đảo thứ tự là migration đổ ngay ở lệnh `CREATE TABLE`.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Ba cột enum sang TEXT, giữ nguyên giá trị ────────────────────────────
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::text;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';

ALTER TABLE "RolePermission" ALTER COLUMN "role" TYPE TEXT USING "role"::text;

ALTER TABLE "StaffInvite" ALTER COLUMN "role" TYPE TEXT USING "role"::text;

-- ── 2. Bỏ enum để giải phóng cái tên ────────────────────────────────────────
DROP TYPE "Role";

-- ── 3. Bảng vai trò ─────────────────────────────────────────────────────────
CREATE TABLE "Role" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT true,
    "isSuper" BOOLEAN NOT NULL DEFAULT false,
    "builtIn" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("key")
);

-- ── 4. Năm vai trò gốc ──────────────────────────────────────────────────────
-- Nhãn chép đúng `ROLE_LABEL` đang viết cứng trong `src/lib/roles.ts`, để sau
-- migration màn hình hiện y hệt hôm qua. Đổi tên vai trò là việc của người bấm,
-- không phải tác dụng phụ của nâng cấp.
--
-- `builtIn` = true cho cả năm: đổi được nhãn, không xoá được. `CUSTOMER` là vai
-- trò duy nhất không phải nhân viên; `ADMIN` là vai trò duy nhất mang siêu quyền.
INSERT INTO "Role" (key, label, "isStaff", "isSuper", "builtIn", sort) VALUES
  ('CUSTOMER',   'Khách hàng',          false, false, true, 0),
  ('STAFF',      'Nhân viên bán hàng',  true,  false, true, 1),
  ('WAREHOUSE',  'Nhân viên kho',       true,  false, true, 2),
  ('ACCOUNTANT', 'Kế toán',             true,  false, true, 3),
  ('ADMIN',      'Chủ cửa hàng',        true,  true,  true, 4)
ON CONFLICT (key) DO NOTHING;

-- ── 5. Nối khoá ngoại ───────────────────────────────────────────────────────
-- `User.role` để `RESTRICT`: xoá một vai trò còn người giữ là đẩy họ vào trạng
-- thái không có vai trò nào. Chặn ở DB, và lớp trên nói rõ đang vướng bao nhiêu
-- người.
--
-- `RolePermission.role` để `CASCADE`: xoá vai trò thì mấy dòng quyền của nó
-- không còn nghĩa gì, giữ lại chỉ tổ rác.
ALTER TABLE "User"
  ADD CONSTRAINT "User_role_fkey" FOREIGN KEY ("role") REFERENCES "Role"("key")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
  ADD CONSTRAINT "RolePermission_role_fkey" FOREIGN KEY ("role") REFERENCES "Role"("key")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffInvite"
  ADD CONSTRAINT "StaffInvite_role_fkey" FOREIGN KEY ("role") REFERENCES "Role"("key")
  ON DELETE RESTRICT ON UPDATE CASCADE;
