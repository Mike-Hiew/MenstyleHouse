"use client";

import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { applyCouponAction, type CouponState } from "@/app/gio-hang/actions";

/**
 * Ô mã giảm giá ở tóm tắt đơn. Theo mockup: input dính liền nút đen "ÁP DỤNG"
 * (viền phải của input bị bỏ để hai khối liền nhau), thông báo hiện ngay dưới.
 */
export function CouponBox() {
  const [state, action, pending] = useActionState<CouponState, FormData>(applyCouponAction, {});

  return (
    <form action={action}>
      <div className="mb-2 flex">
        <label htmlFor="coupon" className="sr-only">
          Mã giảm giá
        </label>
        <input
          id="coupon"
          name="code"
          placeholder="Nhập mã giảm giá"
          className="h-11 min-w-0 flex-1 border border-r-0 border-border-soft bg-bg px-3 text-[16px] outline-none lg:text-[13px]"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 flex-none bg-neutral-900 px-4 text-[12.5px] font-extrabold text-bg disabled:opacity-60"
        >
          {pending ? "…" : "ÁP DỤNG"}
        </button>
      </div>

      {state.message ? (
        <p
          role="status"
          className={cn(
            "mb-3.5 text-[12.5px] font-semibold",
            state.ok ? "text-accent-700" : "text-muted",
          )}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
