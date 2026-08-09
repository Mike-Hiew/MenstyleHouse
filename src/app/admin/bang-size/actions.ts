"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { TAG } from "@/lib/cache-tags";
import { assertPermission, ForbiddenError } from "@/server/admin/guard";
import {
  addRow,
  bangSizeSchema,
  ChartInUseError,
  createSizeChart,
  deleteRow,
  deleteSizeChart,
  dongSchema,
  ganChoDanhMuc,
  updateRow,
  updateSizeChart,
} from "@/server/admin/size-charts";

export type BangSizeState = { ok?: boolean; message?: string };

/**
 * Mọi thao tác ở đây đều dọn nhãn `catalog`: bảng size hiện trên trang sản phẩm
 * và trang đó đang được cache. Sửa xong mà không dọn thì khách vẫn thấy số cũ,
 * và không có gì báo cho ai biết.
 */
function xong(message: string): BangSizeState {
  revalidatePath("/admin/bang-size");
  revalidateTag(TAG.catalog);
  return { ok: true, message };
}

function loi(e: unknown, macDinh: string): BangSizeState {
  if (e instanceof ForbiddenError) return { ok: false, message: e.message };
  if (e instanceof ChartInUseError) return { ok: false, message: e.message };
  console.error(e);
  return { ok: false, message: macDinh };
}

export async function taoBangAction(_prev: BangSizeState, form: FormData): Promise<BangSizeState> {
  const parsed = bangSizeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  let id: string;
  try {
    await assertPermission("bang-size.quan-ly");
    ({ id } = await createSizeChart(parsed.data));
  } catch (e) {
    return loi(e, "Chưa tạo được bảng size.");
  }

  revalidateTag(TAG.catalog);
  // Bảng mới chưa có dòng nào nên đưa thẳng vào màn sửa để nhập tiếp.
  redirect(("/admin/bang-size/" + id) as Route);
}

export async function suaBangAction(_prev: BangSizeState, form: FormData): Promise<BangSizeState> {
  const id = String(form.get("id") ?? "");
  const parsed = bangSizeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  try {
    await assertPermission("bang-size.quan-ly");
    await updateSizeChart(id, parsed.data);
  } catch (e) {
    return loi(e, "Chưa lưu được bảng size.");
  }

  revalidatePath("/admin/bang-size/" + id);
  return xong("Đã lưu bảng size.");
}

export async function xoaBangAction(_prev: BangSizeState, form: FormData): Promise<BangSizeState> {
  try {
    await assertPermission("bang-size.quan-ly");
    await deleteSizeChart(String(form.get("id") ?? ""));
  } catch (e) {
    return loi(e, "Chưa xoá được bảng size.");
  }

  revalidatePath("/admin/bang-size");
  revalidateTag(TAG.catalog);

  /*
   * Về danh sách sau khi xoá. Ở lại là đứng trên trang của một bảng không còn
   * tồn tại: bấm gì cũng lỗi, tải lại thì 404, mà màn hình vẫn hiện đủ dữ liệu
   * như thường. `redirect` ném lỗi điều hướng nên phải nằm ngoài try/catch.
   */
  redirect("/admin/bang-size");
}

export async function themDongAction(_prev: BangSizeState, form: FormData): Promise<BangSizeState> {
  const parsed = dongSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  try {
    await assertPermission("bang-size.quan-ly");
    await addRow(parsed.data);
  } catch (e) {
    return loi(e, "Chưa thêm được dòng.");
  }

  revalidatePath("/admin/bang-size/" + parsed.data.chartId);
  return xong("Đã thêm dòng.");
}

export async function suaDongAction(_prev: BangSizeState, form: FormData): Promise<BangSizeState> {
  const id = String(form.get("rowId") ?? "");
  const chartId = String(form.get("chartId") ?? "");

  try {
    await assertPermission("bang-size.quan-ly");
    await updateRow(id, {
      size: String(form.get("size") ?? ""),
      values: String(form.get("values") ?? ""),
    });
  } catch (e) {
    return loi(e, "Chưa lưu được dòng.");
  }

  revalidatePath("/admin/bang-size/" + chartId);
  return xong("Đã lưu dòng.");
}

export async function xoaDongAction(_prev: BangSizeState, form: FormData): Promise<BangSizeState> {
  const chartId = String(form.get("chartId") ?? "");
  try {
    await assertPermission("bang-size.quan-ly");
    await deleteRow(String(form.get("rowId") ?? ""));
  } catch (e) {
    return loi(e, "Chưa xoá được dòng.");
  }

  revalidatePath("/admin/bang-size/" + chartId);
  return xong("Đã xoá dòng.");
}

export async function ganDanhMucAction(
  _prev: BangSizeState,
  form: FormData,
): Promise<BangSizeState> {
  const categoryId = String(form.get("categoryId") ?? "");
  const chartId = String(form.get("chartId") ?? "");

  try {
    await assertPermission("bang-size.quan-ly");
    await ganChoDanhMuc(categoryId, chartId || null);
  } catch (e) {
    return loi(e, "Chưa gán được bảng size.");
  }

  return xong(chartId ? "Đã gán bảng size cho danh mục." : "Đã gỡ bảng size khỏi danh mục.");
}
