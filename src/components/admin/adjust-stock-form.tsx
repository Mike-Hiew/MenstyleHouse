"use client";

import * as React from "react";
import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { adjustStockAction, type StockState } from "@/app/admin/nhap-kho/actions";

/**
 * Phiếu điều chỉnh tồn. Bắt buộc nhập lý do — sổ kho phải đọc hiểu được sau
 * nhiều tháng, "điều chỉnh −5" mà không nói vì sao là vô dụng khi đối soát.
 */
export function AdjustStockForm() {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<StockState, FormData>(adjustStockAction, {});

  return (
    <div className="mb-6">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="min-h-11 border border-border-soft px-5 text-[13.5px] font-extrabold"
      >
        {open ? "Đóng" : "PHIẾU ĐIỀU CHỈNH TỒN"}
      </button>

      {open ? (
        <form action={action} className="mt-4 border-2 border-border-soft p-5">
          {state.message ? (
            <p
              role="alert"
              className={cn(
                "mb-4 border-2 px-3.5 py-2.5 text-[13px] font-semibold",
                state.ok ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
              )}
            >
              {state.message}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr_2fr_auto]">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold">SKU</span>
              <input name="sku" placeholder="MSH-101-DEN-M" required className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold">Điều chỉnh</span>
              <input name="delta" inputMode="numeric" placeholder="-3 hoặc 5" required className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold">Lý do</span>
              <input name="reason" placeholder="Kiểm kê thừa / hàng lỗi / vỡ hỏng…" required className={input} />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="min-h-12 self-end bg-accent px-5 text-[13.5px] font-extrabold text-bg disabled:opacity-60"
            >
              {pending ? "…" : "GHI SỔ"}
            </button>
          </div>

          <p className="mt-3 text-[12.5px] text-faint">
            Điều chỉnh ghi thẳng vào sổ kho và không hoàn tác được. Số âm để giảm tồn, số dương để
            tăng. Không cho phép làm tồn xuống dưới 0.
          </p>
        </form>
      ) : null}
    </div>
  );
}

const input =
  "w-full border border-border-soft bg-bg px-3 py-2.5 text-[16px] outline-none focus:border-accent lg:text-[14px]";
