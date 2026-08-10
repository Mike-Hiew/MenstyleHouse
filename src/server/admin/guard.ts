import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canDo, type PermissionKey } from "@/lib/permissions";
import { getMatrix } from "@/server/admin/permissions";

/**
 * Phân quyền admin. Kiểm ở **server** cho mọi trang và mọi Server Action —
 * ẩn nút ở UI không phải là kiểm soát (`docs/CLAUDE-rules.md`).
 *
 * `middleware.ts` chỉ chặn sớm cho đỡ tốn render; nó **không** thay thế guard
 * này vì middleware không đọc được DB và có thể bị bỏ qua khi route đổi.
 *
 * Từ M6.8, chốt chặn nói theo **khả năng** (`kho.ghi-so`) chứ không theo danh
 * sách vai trò. Vai trò nào làm được gì là dữ liệu sửa được trong Cài đặt; viết
 * cứng `["ACCOUNTANT","ADMIN"]` ở từng trang thì bảng phân quyền chỉ để trang
 * trí.
 */

/**
 * `role` là **khoá** vai trò; `roleLabel` là nhãn để hiện.
 *
 * Mang sẵn nhãn theo người dùng thay vì bắt mỗi chỗ hiển thị tự tra lại danh
 * sách vai trò — `nhanVienHienTai` vốn đã phải đọc DB, kèm thêm một cột nữa
 * không tốn gì.
 */
export type AdminUser = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  roleLabel: string;
};

export class ForbiddenError extends Error {
  constructor() {
    super("Bạn không có quyền thực hiện thao tác này.");
    this.name = "ForbiddenError";
  }
}

/**
 * Người đang đăng nhập, nếu còn là nhân viên **và tài khoản chưa bị tắt**.
 *
 * Trạng thái bật/tắt và vai trò đọc lại từ DB mỗi lần, không tin JWT: phiên
 * đăng nhập sống hàng ngày, mà tắt một tài khoản thì phải có tác dụng **ngay**
 * chứ không đợi người đó tự đăng xuất.
 */
const nhanVienHienTai = cache(async (): Promise<AdminUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const u = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      // "Có phải nhân viên không" giờ là **dữ liệu của vai trò**, không còn là
      // một danh sách viết cứng trong mã. Nối luôn ở đây thay vì đọc thêm một
      // lượt: câu này đã chạy sẵn cho mọi trang quản trị rồi.
      roleRef: { select: { label: true, isStaff: true } },
    },
  });
  if (!u || !u.active || !u.roleRef.isStaff) return null;

  return { id: u.id, name: u.name, email: u.email, role: u.role, roleLabel: u.roleRef.label };
});

/**
 * Nhân viên đang đăng nhập, hoặc `null`. **Không** chuyển hướng — dùng cho chỗ
 * chỉ muốn *biết* để hiện thêm gì đó, như lối vào khu quản trị trên header
 * storefront.
 */
export async function currentStaff(): Promise<AdminUser | null> {
  return nhanVienHienTai();
}

/**
 * Dùng trong layout/trang admin. Không phải nhân viên thì đá về đăng nhập.
 *
 * Bỏ tham số `allowed` từ M6.22: nó nhận một danh sách vai trò viết cứng, mà từ
 * M6.8 mọi chốt chặn đã nói theo **khả năng** (`requirePermission`) chứ không
 * theo vai trò. Giữ lại một cửa vào theo danh sách vai trò là giữ lại đúng thứ
 * mà bảng phân quyền sinh ra để thay thế.
 */
export async function requireStaff(): Promise<AdminUser> {
  const me = await nhanVienHienTai();
  if (!me) redirect("/dang-nhap");
  return me;
}

/** Trang cần một khả năng cụ thể. */
export async function requirePermission(key: PermissionKey): Promise<AdminUser> {
  const me = await nhanVienHienTai();
  if (!me) redirect("/dang-nhap");

  const matrix = await getMatrix();
  if (!canDo(me.role, key, matrix)) redirect("/admin");

  return me;
}

/**
 * Dùng trong Server Action: ném lỗi thay vì redirect để action trả về thông
 * báo cho form.
 */
export async function assertStaff(): Promise<AdminUser> {
  const me = await nhanVienHienTai();
  if (!me) throw new ForbiddenError();
  return me;
}

export async function assertPermission(key: PermissionKey): Promise<AdminUser> {
  const me = await nhanVienHienTai();
  if (!me) throw new ForbiddenError();

  const matrix = await getMatrix();
  if (!canDo(me.role, key, matrix)) throw new ForbiddenError();

  return me;
}

/** Cho UI biết nên hiện gì. Chốt chặn thật vẫn là `assertPermission` ở server. */
export async function myPermissions(): Promise<{
  me: AdminUser | null;
  can: (key: PermissionKey) => boolean;
}> {
  const me = await nhanVienHienTai();
  if (!me) return { me: null, can: () => false };

  const matrix = await getMatrix();
  return { me, can: (key) => canDo(me.role, key, matrix) };
}
