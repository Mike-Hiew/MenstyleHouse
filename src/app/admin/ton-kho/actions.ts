"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertPermission, currentStaff, ForbiddenError } from "@/server/admin/guard";
import { chuyenKho, InsufficientStockError, SameWarehouseError } from "@/lib/inventory";

export type ChuyenKhoState = { ok?: boolean; message?: string };

const schema = z.object({
  variantId: z.string().min(1),
  tuKho: z.string().min(1, "Chọn kho đi"),
  denKho: z.string().min(1, "Chọn kho đến"),
  soLuong: z.coerce.number().int().min(1, "Số lượng phải lớn hơn 0").max(100_000),
});

/** Chuyển hàng giữa hai kho. Đi qua `chuyenKho` nên luôn sinh hai dòng sổ. */
export async function chuyenKhoAction(
  _prev: ChuyenKhoState,
  form: FormData,
): Promise<ChuyenKhoState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  try {
    await assertPermission("kho.ghi-so");
    const actor = await currentStaff();
    await db.$transaction((tx) =>
      chuyenKho(tx, { ...parsed.data, actorName: actor?.name ?? "Thủ kho" }),
    );
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof SameWarehouseError) return { ok: false, message: e.message };
    if (e instanceof InsufficientStockError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Chưa chuyển được. Bạn thử lại giúp." };
  }

  revalidatePath("/admin/ton-kho");
  return { ok: true, message: "Đã chuyển kho." };
}
