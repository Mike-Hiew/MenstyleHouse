"use client";

import { useActionState, useEffect, useId } from "react";
import { cn } from "@/lib/cn";
import { applyCouponAction, type CouponState } from "@/app/gio-hang/actions";

/**
 * Ô mã giảm giá ở tóm tắt đơn. Theo mockup: input dính liền nút đen "ÁP DỤNG"
 * (viền phải của input bị bỏ để hai khối liền nhau), thông báo hiện ngay dưới.
 */
export function CouponBox({ onApplied }: { onApplied?: () => void } = {}) {
  const [state, action, pending] = useActionState<CouponState, FormData>(applyCouponAction, {});
  // Ngăn kéo giỏ và trang giỏ có thể cùng có mặt — id phải riêng từng ô.
  const id = useId();

  // Ngăn kéo cần đọc lại tổng tiền sau mỗi lần áp mã (đúng hay sai).
  useEffect(() => {
    if (state.message) onApplied?.();
  }, [state, onApplied]);

  return (
    <form action={action}>
      <div className="mb-2 flex rounded-full bg-field p-1 focus-within:bg-surface focus-within:ring-4 focus-within:ring-ring">
        <label htmlFor={id} className="sr-only">
          Mã giảm giá
        </label>
        <input
          id={id}
          name="code"
          placeholder="Nhập mã giảm giá"
          className="h-10 min-w-0 flex-1 bg-transparent px-3.5 text-[16px] outline-none lg:text-[13px]"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-10 flex-none rounded-full bg-neutral-900 px-4 text-[12.5px] font-semibold text-bg disabled:opacity-60"
        >
          {pending ? "…" : "ÁP DỤNG"}
        </button>
      </div>

      {state.message ? (
        /*
         * Lỗi phải nổi hơn thành công, không phải ngược lại. Bản trước tô mã
         * áp thành công bằng đỏ nổi bật còn mã bị từ chối bằng `text-muted` —
         * màu nhạt nhất trang — nên khách gõ sai mã thì gần như không thấy gì.
         *
         * `role` cũng đổi theo: lỗi dùng `alert` (đọc ngay), thành công dùng
         * `status` (đọc khi rảnh).
         */
        <p
          role={state.ok ? "status" : "alert"}
          className={cn(
            "mb-3.5 text-[12.5px] font-semibold",
            state.ok
              ? "text-muted"
              : "rounded-2xl bg-accent-100 px-3 py-2 text-accent-800",
          )}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
