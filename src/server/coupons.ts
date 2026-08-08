import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Áp mã giảm giá. Mọi điều kiện kiểm ở server — client chỉ hiển thị kết quả.
 * `docs/API.md`: trả `{discount, message}` hoặc mã lỗi `COUPON_INVALID`.
 */

export type CouponResult =
  | { ok: true; code: string; discount: number; freeship: boolean; message: string }
  | { ok: false; message: string };

/** Giảm giá không bao giờ vượt quá tạm tính — tiền là Int đồng, không âm. */
function capDiscount(value: number, subtotal: number) {
  return Math.max(0, Math.min(Math.round(value), subtotal));
}

export async function applyCoupon(
  rawCode: string,
  subtotal: number,
  opts: { isMember?: boolean } = {},
): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, message: "Nhập mã giảm giá trước đã." };

  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) {
    return { ok: false, message: "Mã này không tồn tại hoặc đã ngừng áp dụng." };
  }

  const now = new Date();
  if (now < coupon.startsAt) return { ok: false, message: "Mã chưa tới ngày áp dụng." };
  if (now > coupon.endsAt) return { ok: false, message: "Mã đã hết hạn." };

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, message: "Mã đã hết lượt sử dụng." };
  }

  if (coupon.memberOnly && !opts.isMember) {
    return { ok: false, message: "Mã này chỉ dành cho thành viên. Đăng ký để dùng nhé." };
  }

  if (subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      message: "Đơn tối thiểu " + coupon.minSubtotal.toLocaleString("vi-VN") + " ₫ mới dùng được mã.",
    };
  }

  if (coupon.type === "FREESHIP") {
    return { ok: true, code, discount: 0, freeship: true, message: "Đã áp dụng miễn phí giao hàng." };
  }

  const raw =
    coupon.type === "PERCENT" ? (subtotal * coupon.value) / 100 : coupon.value;
  const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  const discount = capDiscount(capped, subtotal);

  if (discount === 0) return { ok: false, message: "Mã không giảm được cho đơn này." };

  return {
    ok: true,
    code,
    discount,
    freeship: false,
    message: "Đã giảm " + discount.toLocaleString("vi-VN") + " ₫.",
  };
}

/** Tăng lượt dùng — gọi trong transaction đặt đơn. */
export async function consumeCoupon(tx: Prisma.TransactionClient, code: string) {
  await tx.coupon.update({ where: { code }, data: { usedCount: { increment: 1 } } });
}

export async function findCouponByCode(code: string) {
  return db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
}
