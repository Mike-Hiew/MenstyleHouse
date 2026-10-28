"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addToCart,
  readCart,
  readCartCoupon,
  removeCartItem,
  setCartCoupon,
  updateCartItem,
  type CartLine,
} from "@/server/cart";
import { applyCoupon, findCouponByCode } from "@/server/coupons";
import { getSettings } from "@/server/settings";
import { pointsFor } from "@/lib/money";

/**
 * Server Actions cho giỏ hàng. Dữ liệu vào luôn qua Zod ở server kể cả khi
 * client đã kiểm — `docs/CLAUDE-rules.md`.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

const addSchema = z.object({
  variantId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(99),
});

const itemSchema = z.object({
  itemId: z.string().min(1),
  qty: z.coerce.number().int().min(0).max(99),
});

export async function addToCartAction(form: FormData): Promise<ActionResult> {
  const parsed = addSchema.safeParse({
    variantId: form.get("variantId"),
    qty: form.get("qty"),
  });
  if (!parsed.success) return { ok: false, message: "Lựa chọn không hợp lệ." };

  const cart = await addToCart(parsed.data.variantId, parsed.data.qty);
  const line = cart.lines.find((l) => l.variantId === parsed.data.variantId);
  if (!line) return { ok: false, message: "Sản phẩm này đang hết hàng." };

  revalidatePath("/gio-hang");
  return { ok: true };
}

export async function updateCartItemAction(form: FormData): Promise<ActionResult> {
  const parsed = itemSchema.safeParse({
    itemId: form.get("itemId"),
    qty: form.get("qty"),
  });
  if (!parsed.success) return { ok: false, message: "Số lượng không hợp lệ." };

  await updateCartItem(parsed.data.itemId, parsed.data.qty);
  revalidatePath("/gio-hang");
  return { ok: true };
}

export async function removeCartItemAction(form: FormData): Promise<ActionResult> {
  const itemId = String(form.get("itemId") ?? "");
  if (!itemId) return { ok: false, message: "Không tìm thấy dòng hàng." };

  await removeCartItem(itemId);
  revalidatePath("/gio-hang");
  return { ok: true };
}

/* ── Mã giảm giá ──────────────────────────────────────────── */

export type CouponState = { ok?: boolean; message?: string; discount?: number };

/**
 * Áp mã ở giỏ. Kết quả chỉ để hiển thị — số tiền giảm được tính lại ở server
 * lúc đặt đơn, không tin giá trị client gửi lên.
 */
export async function applyCouponAction(
  _prev: CouponState,
  form: FormData,
): Promise<CouponState> {
  const cart = await readCart();
  const subtotal = cart?.subtotal ?? 0;
  const raw = String(form.get("code") ?? "");
  const res = await applyCoupon(raw, subtotal);

  if (!res.ok) {
    await setCartCoupon(null);
    revalidatePath("/gio-hang");
    return { ok: false, message: res.message };
  }

  // Gắn mã vào giỏ để `placeOrder` đọc lại và tự tính tiền giảm.
  const coupon = await findCouponByCode(res.code);
  await setCartCoupon(coupon?.id ?? null);
  revalidatePath("/gio-hang");
  return { ok: true, message: res.message, discount: res.discount };
}

/* ── Ngăn kéo giỏ ─────────────────────────────────────────── */

export type CartDrawerData = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  coupon: { code: string; discount: number } | null;
  payable: number;
  /** Ngưỡng free ship lấy từ cài đặt cửa hàng — không viết cứng 500.000 ₫. */
  freeShipFrom: number;
  points: number;
};

/**
 * Đọc giỏ cho ngăn kéo. Cùng cách tính với trang `/gio-hang` để hai nơi không
 * bao giờ ra hai con số khác nhau.
 */
export async function readCartDrawerAction(): Promise<CartDrawerData> {
  const [cart, coupon, caiDat] = await Promise.all([readCart(), readCartCoupon(), getSettings()]);
  const subtotal = cart?.subtotal ?? 0;
  const payable = Math.max(0, subtotal - (coupon?.discount ?? 0));
  return {
    lines: cart?.lines ?? [],
    count: cart?.count ?? 0,
    subtotal,
    coupon,
    payable,
    freeShipFrom: caiDat.freeShipFrom,
    points: pointsFor(payable),
  };
}
