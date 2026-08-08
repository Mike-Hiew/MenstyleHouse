import "server-only";
import { cache } from "react";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { isPermissionKey, SIEU_QUYEN, type PermissionKey } from "@/lib/permissions";

/**
 * Ma trận vai trò × khả năng.
 *
 * Đọc qua `cache()` của React: mỗi trang quản trị kiểm quyền ít nhất một lần,
 * có trang kiểm vài lần cho vài khối khác nhau.
 */

export type Matrix = Record<string, PermissionKey[]>;

export const getMatrix = cache(async (): Promise<Matrix> => {
  const rows = await db.rolePermission.findMany({ select: { role: true, permission: true } });
  const ra: Matrix = {};
  for (const r of rows) {
    // Bỏ qua khoá lạ: danh mục khả năng nằm trong mã, DB có thể còn dòng cũ của
    // một khả năng đã bị xoá khỏi mã. Giữ lại là cho phép một thứ không còn tồn tại.
    if (!isPermissionKey(r.permission)) continue;
    (ra[r.role] ??= []).push(r.permission);
  }
  return ra;
});

/**
 * Ghi lại toàn bộ khả năng của một vai trò.
 *
 * `ADMIN` bị chặn: chủ cửa hàng luôn có mọi khả năng. Cho sửa là mở đường tự
 * khoá cửa — gỡ đúng `phan-quyen.quan-ly` thì không còn ai vào được màn này để
 * sửa lại.
 */
export class CannotEditAdminError extends Error {
  constructor() {
    super("Chủ cửa hàng luôn có mọi quyền, không đổi được.");
    this.name = "CannotEditAdminError";
  }
}

export async function setRolePermissions(role: Role, keys: string[]) {
  if (role === SIEU_QUYEN) throw new CannotEditAdminError();

  const sach = [...new Set(keys.filter(isPermissionKey))];

  await db.$transaction([
    db.rolePermission.deleteMany({ where: { role } }),
    db.rolePermission.createMany({
      data: sach.map((permission) => ({ role, permission })),
    }),
  ]);
}
