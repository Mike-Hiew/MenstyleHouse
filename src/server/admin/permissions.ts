import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { isPermissionKey, PERMISSION_KEYS, type PermissionKey } from "@/lib/permissions";

/**
 * Ma trận vai trò × khả năng.
 *
 * Đọc qua `cache()` của React: mỗi trang quản trị kiểm quyền ít nhất một lần,
 * có trang kiểm vài lần cho vài khối khác nhau.
 */

export type Matrix = Record<string, PermissionKey[]>;

export const getMatrix = cache(async (): Promise<Matrix> => {
  const [rows, sieu] = await Promise.all([
    db.rolePermission.findMany({ select: { role: true, permission: true } }),
    db.role.findMany({ where: { isSuper: true }, select: { key: true } }),
  ]);

  const ra: Matrix = {};
  for (const r of rows) {
    // Bỏ qua khoá lạ: danh mục khả năng nằm trong mã, DB có thể còn dòng cũ của
    // một khả năng đã bị xoá khỏi mã. Giữ lại là cho phép một thứ không còn tồn tại.
    if (!isPermissionKey(r.permission)) continue;
    (ra[r.role] ??= []).push(r.permission);
  }

  /*
   * Vai trò siêu quyền nhận **mọi khả năng** ngay tại đây.
   *
   * Trước M6.22 chuyện này là một nhánh `if (role === "ADMIN")` trong `canDo` —
   * một cái tên viết cứng nằm giữa lớp thuần, và `canDo` thì được gọi ở mọi chốt
   * chặn. Rót vào ma trận thì siêu quyền thành dữ liệu: `canDo` chỉ còn tra
   * bảng, và cửa hàng đổi tên vai trò chủ cửa hàng cũng không làm gì vỡ.
   */
  for (const s of sieu) ra[s.key] = [...PERMISSION_KEYS];

  return ra;
});

/**
 * Ghi lại toàn bộ khả năng của một vai trò.
 *
 * Vai trò siêu quyền bị chặn: chủ cửa hàng luôn có mọi khả năng. Cho sửa là mở
 * đường tự khoá cửa — gỡ đúng `phan-quyen.quan-ly` thì không còn ai vào được màn
 * này để sửa lại.
 */
export class CannotEditAdminError extends Error {
  constructor() {
    super("Chủ cửa hàng luôn có mọi quyền, không đổi được.");
    this.name = "CannotEditAdminError";
  }
}

export async function setRolePermissions(role: string, keys: string[]) {
  const vt = await db.role.findUnique({ where: { key: role }, select: { isSuper: true } });
  if (!vt) throw new Error("Không tìm thấy vai trò " + role);
  if (vt.isSuper) throw new CannotEditAdminError();

  const sach = [...new Set(keys.filter(isPermissionKey))];

  await db.$transaction([
    db.rolePermission.deleteMany({ where: { role } }),
    db.rolePermission.createMany({
      data: sach.map((permission) => ({ role, permission })),
    }),
  ]);
}
