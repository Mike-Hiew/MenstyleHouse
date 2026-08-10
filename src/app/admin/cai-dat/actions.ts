"use server";

import { revalidatePath } from "next/cache";
import { assertPermission, ForbiddenError } from "@/server/admin/guard";
import {
  cuaHangSchema,
  luuCuaHang,
  luuThanThiet,
  luuThanhToan,
  luuVanChuyen,
  thanThietSchema,
  thanhToanSchema,
  vanChuyenSchema,
} from "@/server/settings";
import type { AdminActionState } from "@/app/admin/actions";

/**
 * Lưu cài đặt theo **từng trang một**.
 *
 * Trước M6.20 cả màn Cài đặt là một form và một action duy nhất. Sửa số hotline
 * cũng gửi lại toàn bộ, và một ngưỡng hạng đặt ngược ở cuối trang chặn luôn việc
 * lưu tên cửa hàng ở đầu trang — lỗi hiện ra ở chỗ chẳng liên quan gì.
 *
 * Mỗi action ở đây chỉ đụng đúng phần của trang mình, nên lỗi cũng chỉ nằm trong
 * phạm vi trang đó.
 */

/**
 * Cài đặt chạm gần như mọi trang: hoá đơn lấy thuế suất, giỏ lấy ngưỡng miễn phí
 * ship, chân trang lấy thông tin cửa hàng. Xoá cache toàn bộ layout thay vì liệt
 * kê từng đường dẫn rồi sót một chỗ hiển thị số cũ.
 */
function xong(): AdminActionState {
  revalidatePath("/", "layout");
  return { ok: true, message: "Đã lưu." };
}

function loi(e: unknown): AdminActionState {
  if (e instanceof ForbiddenError) return { ok: false, message: e.message };
  console.error(e);
  return { ok: false, message: "Không lưu được cài đặt." };
}

export async function luuCuaHangAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const parsed = cuaHangSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  try {
    await assertPermission("cai-dat.quan-ly");
    await luuCuaHang(parsed.data);
  } catch (e) {
    return loi(e);
  }
  return xong();
}

export async function luuThanhToanAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const parsed = thanhToanSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  try {
    await assertPermission("cai-dat.quan-ly");
    await luuThanhToan(parsed.data);
  } catch (e) {
    return loi(e);
  }
  return xong();
}

export async function luuVanChuyenAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const parsed = vanChuyenSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  try {
    await assertPermission("cai-dat.quan-ly");
    await luuVanChuyen(parsed.data);
  } catch (e) {
    return loi(e);
  }
  return xong();
}

export async function luuThanThietAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const parsed = thanThietSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  try {
    await assertPermission("cai-dat.quan-ly");
    await luuThanThiet(parsed.data);
  } catch (e) {
    return loi(e);
  }
  return xong();
}
