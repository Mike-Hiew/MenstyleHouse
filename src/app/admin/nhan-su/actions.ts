"use server";

import { revalidatePath } from "next/cache";
import { assertPermission, ForbiddenError } from "@/server/admin/guard";
import {
  createRole,
  deleteRole,
  KhoaSaiDangError,
  KhoaTrungError,
  taoVaiTroSchema,
  updateRole,
  VaiTroDangDungError,
  VaiTroGocError,
  vaiTroSchema,
} from "@/server/admin/roles";
import type { AdminActionState } from "@/app/admin/actions";

/**
 * Quản lý vai trò.
 *
 * Cùng khả năng `phan-quyen.quan-ly` với việc sửa ma trận: tạo một vai trò rồi
 * tick quyền cho nó là **cùng một việc**, tách hai khả năng chỉ tạo ra một tổ
 * hợp vô nghĩa là "được tạo vai trò nhưng không được cấp quyền cho nó".
 */

function xong(message: string): AdminActionState {
  /*
   * Dọn cache cả layout: nhãn vai trò hiện trên thanh bên quản trị, trên header
   * storefront và ở trang tài khoản của khách. Đổi tên vai trò mà chỉ dọn trang
   * này thì ba chỗ kia còn hiện tên cũ.
   */
  revalidatePath("/", "layout");
  return { ok: true, message };
}

function loi(e: unknown, macDinh: string): AdminActionState {
  if (e instanceof ForbiddenError) return { ok: false, message: e.message };
  if (e instanceof KhoaTrungError) return { ok: false, message: e.message };
  if (e instanceof KhoaSaiDangError) return { ok: false, message: e.message };
  if (e instanceof VaiTroGocError) return { ok: false, message: e.message };
  if (e instanceof VaiTroDangDungError) return { ok: false, message: e.message };
  console.error(e);
  return { ok: false, message: macDinh };
}

export async function themVaiTroAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const parsed = taoVaiTroSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  try {
    await assertPermission("phan-quyen.quan-ly");
    await createRole(parsed.data);
  } catch (e) {
    return loi(e, "Chưa tạo được vai trò.");
  }
  return xong("Đã tạo vai trò. Nhớ tick quyền cho nó ở khối bên dưới.");
}

export async function suaVaiTroAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const key = String(form.get("key") ?? "");
  const parsed = vaiTroSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  try {
    await assertPermission("phan-quyen.quan-ly");
    await updateRole(key, parsed.data);
  } catch (e) {
    return loi(e, "Chưa lưu được vai trò.");
  }
  return xong("Đã lưu vai trò.");
}

export async function xoaVaiTroAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  try {
    await assertPermission("phan-quyen.quan-ly");
    await deleteRole(String(form.get("key") ?? ""));
  } catch (e) {
    return loi(e, "Chưa xoá được vai trò.");
  }
  return xong("Đã xoá vai trò.");
}
