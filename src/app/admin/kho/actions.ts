"use server";

import { revalidatePath } from "next/cache";
import { assertPermission, ForbiddenError } from "@/server/admin/guard";
import {
  createWarehouse,
  deleteWarehouse,
  khoSchema,
  KhoChinhError,
  KhoConTonError,
  KhoCoLichSuError,
  KhoCuoiCungError,
  setMainWarehouse,
  updateWarehouse,
} from "@/server/admin/warehouses";
import type { AdminActionState } from "@/app/admin/actions";

/**
 * Danh mục kho.
 *
 * Dùng `kho.ghi-so` chứ không phải `kho.xem`: mở và đóng kho là việc một chiều,
 * cùng nhóm với ghi sổ phiếu nhập. Kế toán xem được tồn nhưng không được đụng
 * vào danh mục kho.
 */

/**
 * Dọn cache của cả ba màn đọc danh sách kho: danh mục kho, tồn kho theo kho, và
 * ô chọn kho ở phiếu nhập. Sửa tên kho mà chỉ dọn một chỗ thì hai chỗ kia còn
 * hiện tên cũ, và không có gì báo cho ai biết.
 */
function xong(message: string): AdminActionState {
  revalidatePath("/admin/kho");
  revalidatePath("/admin/ton-kho");
  revalidatePath("/admin/nhap-kho");
  return { ok: true, message };
}

function loi(e: unknown, macDinh: string): AdminActionState {
  if (e instanceof ForbiddenError) return { ok: false, message: e.message };
  if (e instanceof KhoConTonError) return { ok: false, message: e.message };
  if (e instanceof KhoCoLichSuError) return { ok: false, message: e.message };
  if (e instanceof KhoChinhError) return { ok: false, message: e.message };
  if (e instanceof KhoCuoiCungError) return { ok: false, message: e.message };
  console.error(e);
  return { ok: false, message: macDinh };
}

export async function themKhoAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const parsed = khoSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  try {
    await assertPermission("kho.ghi-so");
    await createWarehouse(parsed.data);
  } catch (e) {
    return loi(e, "Chưa thêm được kho.");
  }
  return xong("Đã thêm kho.");
}

export async function suaKhoAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const id = String(form.get("id") ?? "");
  const parsed = khoSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  try {
    await assertPermission("kho.ghi-so");
    await updateWarehouse(id, parsed.data);
  } catch (e) {
    return loi(e, "Chưa lưu được kho.");
  }
  return xong("Đã lưu kho.");
}

export async function datKhoChinhAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  try {
    await assertPermission("kho.ghi-so");
    await setMainWarehouse(String(form.get("id") ?? ""));
  } catch (e) {
    return loi(e, "Chưa đổi được kho chính.");
  }
  return xong("Đã đổi kho chính. Hàng nhập về không chỉ định kho sẽ vào kho này.");
}

export async function xoaKhoAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  try {
    await assertPermission("kho.ghi-so");
    await deleteWarehouse(String(form.get("id") ?? ""));
  } catch (e) {
    return loi(e, "Chưa xoá được kho.");
  }
  return xong("Đã xoá kho.");
}
