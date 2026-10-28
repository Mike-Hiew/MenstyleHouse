"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";
import { assertPermission, ForbiddenError } from "@/server/admin/guard";
import { findVariantBySku } from "@/server/admin/inventory";
import {
  addLine,
  adjustStock,
  AdjustmentBelowZeroError,
  cancelReceipt,
  createDraft,
  EmptyReceiptError,
  postReceipt,
  ReceiptAlreadyPostedError,
  removeLine,
} from "@/server/admin/receipts";

/**
 * Thao tác kho. Chỉ thủ kho và chủ cửa hàng — kiểm ở server cho từng action,
 * không dựa vào việc UI có hiện nút hay không.
 */

export type StockState = { ok?: boolean; message?: string };

/** Gom lỗi nghiệp vụ về một chỗ để form nào cũng hiện được thông báo tiếng Việt. */
function toMessage(e: unknown): string {
  if (e instanceof ForbiddenError) return e.message;
  if (e instanceof ReceiptAlreadyPostedError) return e.message;
  if (e instanceof EmptyReceiptError) return e.message;
  if (e instanceof AdjustmentBelowZeroError) return e.message;
  console.error(e);
  return "Thao tác không thành công. Bạn thử lại giúp.";
}

const draftSchema = z.object({
  warehouseId: z.string().min(1, "Chọn kho"),
  supplierId: z.string().min(1, "Chọn nhà cung cấp"),
  refDoc: z.string().trim().max(60).optional(),
  vatRate: z.coerce.number().int().min(0).max(20),
});

export async function createDraftAction(_prev: StockState, form: FormData): Promise<StockState> {
  const parsed = draftSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  let code: string;
  try {
    const user = await assertPermission("kho.ghi-so");
    code = await createDraft({ ...parsed.data, createdById: user.id, actorName: user.name });
  } catch (e) {
    return { ok: false, message: toMessage(e) };
  }

  redirect(("/admin/nhap-kho/" + code) as Route);
}

const lineSchema = z.object({
  code: z.string().min(1),
  sku: z.string().trim().min(1, "Nhập SKU"),
  qty: z.coerce.number().int().min(1, "Số lượng tối thiểu 1").max(100_000),
  unitCost: z.coerce.number().int().min(0).max(100_000_000),
});

export async function addLineAction(_prev: StockState, form: FormData): Promise<StockState> {
  const parsed = lineSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  try {
    await assertPermission("kho.ghi-so");
    const variant = await findVariantBySku(parsed.data.sku);
    if (!variant) return { ok: false, message: `Không có SKU "${parsed.data.sku}" trong hệ thống.` };

    await addLine(parsed.data.code, {
      variantId: variant.id,
      sku: variant.sku,
      qty: parsed.data.qty,
      unitCost: parsed.data.unitCost,
    });
  } catch (e) {
    return { ok: false, message: toMessage(e) };
  }

  revalidatePath("/admin/nhap-kho/" + parsed.data.code);
  return { ok: true, message: "Đã thêm dòng hàng." };
}

export async function removeLineAction(_prev: StockState, form: FormData): Promise<StockState> {
  const code = String(form.get("code") ?? "");
  const lineId = String(form.get("lineId") ?? "");

  try {
    await assertPermission("kho.ghi-so");
    await removeLine(code, lineId);
  } catch (e) {
    return { ok: false, message: toMessage(e) };
  }

  revalidatePath("/admin/nhap-kho/" + code);
  return { ok: true, message: "Đã xoá dòng hàng." };
}

export async function postReceiptAction(_prev: StockState, form: FormData): Promise<StockState> {
  const code = String(form.get("code") ?? "");

  try {
    const user = await assertPermission("kho.ghi-so");
    await postReceipt(code, user.name);
  } catch (e) {
    return { ok: false, message: toMessage(e) };
  }

  revalidatePath("/admin/nhap-kho");
  revalidatePath("/admin/nhap-kho/" + code);
  revalidatePath("/admin/ton-kho");
  return { ok: true, message: "Đã ghi sổ. Tồn kho đã cập nhật." };
}

export async function cancelReceiptAction(_prev: StockState, form: FormData): Promise<StockState> {
  const code = String(form.get("code") ?? "");

  try {
    const user = await assertPermission("kho.ghi-so");
    await cancelReceipt(code, user.name);
  } catch (e) {
    return { ok: false, message: toMessage(e) };
  }

  revalidatePath("/admin/nhap-kho/" + code);
  return { ok: true, message: "Đã huỷ phiếu nháp." };
}

const adjustSchema = z.object({
  sku: z.string().trim().min(1, "Nhập SKU"),
  delta: z.coerce.number().int().refine((n) => n !== 0, "Số điều chỉnh phải khác 0"),
  reason: z.string().trim().min(4, "Nhập lý do điều chỉnh").max(200),
});

export async function adjustStockAction(_prev: StockState, form: FormData): Promise<StockState> {
  const parsed = adjustSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  try {
    const user = await assertPermission("kho.ghi-so");
    const variant = await findVariantBySku(parsed.data.sku);
    if (!variant) return { ok: false, message: `Không có SKU "${parsed.data.sku}" trong hệ thống.` };

    await adjustStock({
      variantId: variant.id,
      delta: parsed.data.delta,
      reason: parsed.data.reason,
      actorName: user.name,
    });
  } catch (e) {
    return { ok: false, message: toMessage(e) };
  }

  revalidatePath("/admin/ton-kho");
  return { ok: true, message: "Đã ghi phiếu điều chỉnh." };
}
