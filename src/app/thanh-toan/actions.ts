"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { checkoutSchema, placeOrder, CartEmptyError, OutOfStockError } from "@/server/orders";
import { getSettings } from "@/server/settings";
import { mailXacNhanDon } from "@/server/mail-templates";
import { db } from "@/lib/db";

export type CheckoutState = {
  /** Lỗi theo từng trường, khớp `name` của input. */
  errors?: Record<string, string>;
  message?: string;
  /**
   * Những gì khách vừa gõ, trả ngược về để điền lại form.
   *
   * React 19 **tự reset** `<form action={...}>` sau mỗi lần action chạy xong.
   * Với input không điều khiển, đó là xoá trắng toàn bộ những gì khách vừa
   * nhập ngay khi có một lỗi hợp lệ — người ta gõ lại từ đầu chỉ vì thiếu mã
   * số thuế. Form đọc lại từ đây làm `defaultValue` nên dữ liệu quay về nguyên.
   */
  values?: Record<string, string>;
};

/** Chỉ trả lại các ô văn bản; không mang theo idempotencyKey hay file. */
function daNhap(form: FormData): Record<string, string> {
  const ra: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (k === "idempotencyKey" || typeof v !== "string") continue;
    ra[k] = v;
  }
  return ra;
}

/**
 * Đặt đơn. Kiểm bằng Zod ở server kể cả khi client đã kiểm
 * (`docs/CLAUDE-rules.md`), lỗi trả về theo trường để form hiện đúng chỗ.
 */
export async function placeOrderAction(
  _prev: CheckoutState,
  form: FormData,
): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(form));

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { errors, message: "Kiểm tra lại các ô được đánh dấu.", values: daNhap(form) };
  }

  let code: string;
  try {
    ({ code } = await placeOrder(parsed.data));
  } catch (e) {
    if (e instanceof CartEmptyError) {
      return { message: "Giỏ hàng đang trống. Bạn chọn sản phẩm trước nhé." };
    }
    if (e instanceof OutOfStockError) {
      return {
        message: `${e.message} Bạn giảm số lượng trong giỏ rồi đặt lại giúp.`,
        values: daNhap(form),
      };
    }
    console.error(e);
    return {
      message: "Không đặt được đơn. Bạn thử lại hoặc gọi 1900 6060.",
      values: daNhap(form),
    };
  }

  /*
   * Mail xác nhận: **best-effort**, sau khi đơn đã chắc chắn thành công.
   *
   * Bọc try/catch riêng vì đơn đã nằm trong DB rồi — nhà cung cấp mail chết mà
   * kéo theo lỗi ở đây thì khách thấy "không đặt được đơn" trong khi đơn đã
   * được ghi nhận, rồi đặt lại thành hai đơn.
   */
  if (parsed.data.email) {
    try {
      const [caiDat, don] = await Promise.all([
        getSettings(),
        db.order.findUnique({
          where: { code },
          select: { total: true, receiver: true, paymentMethod: true },
        }),
      ]);
      if (don) {
        await mailXacNhanDon({
          to: parsed.data.email,
          ten: don.receiver,
          maDon: code,
          tong: don.total,
          hinhThuc:
            don.paymentMethod === "BANK_TRANSFER"
              ? "Chuyển khoản ngân hàng"
              : "Thanh toán khi nhận hàng",
          hotline: caiDat.hotline,
        });
      }
    } catch (e) {
      console.error("[mail] không gửi được xác nhận đơn", code, e);
    }
  }

  // redirect ném lỗi điều hướng nên phải nằm ngoài try/catch.
  redirect(("/dat-hang-thanh-cong/" + code) as Route);
}
