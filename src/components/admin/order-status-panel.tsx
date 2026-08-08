"use client";

import { useActionState } from "react";
import type { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { advanceOrderAction, type AdminActionState } from "@/app/admin/actions";

/**
 * Đổi trạng thái đơn. Chỉ hiện đúng những bước máy trạng thái cho phép; server
 * vẫn kiểm lại lần nữa nên bấm tay vào action cũng không nhảy cóc được.
 */
export function OrderStatusPanel({
  code,
  current,
  next,
  labels,
}: {
  code: string;
  current: OrderStatus;
  next: OrderStatus[];
  labels: Record<OrderStatus, string>;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    advanceOrderAction,
    {},
  );

  return (
    <div className="border-2 border-border-soft p-5">
      <p className="label-tech mb-2 font-bold">TRẠNG THÁI HIỆN TẠI</p>
      <p className="mb-4 text-[20px] font-extrabold">{labels[current]}</p>

      {state.message ? (
        <p
          role="alert"
          className={cn(
            "mb-4 border-2 px-3.5 py-2.5 text-[13px] font-semibold",
            state.ok
              ? "border-divider bg-subtle"
              : "border-accent bg-accent-100 text-accent-800",
          )}
        >
          {state.message}
        </p>
      ) : null}

      {next.length === 0 ? (
        <p className="text-[13px] text-muted">Đơn đã ở trạng thái cuối, không đổi tiếp được.</p>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="code" value={code} />

          <label className="block">
            <span className="label-tech mb-1.5 block font-bold">GHI CHÚ NỘI BỘ</span>
            <input
              name="note"
              placeholder="Ví dụ: khách hẹn giao sau 17h"
              className="h-11 w-full border border-border-soft bg-bg px-3 text-[16px] outline-none lg:text-[14px]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {next.map((s) => {
              const danger = s === "CANCELLED" || s === "RETURNED";
              return (
                <button
                  key={s}
                  type="submit"
                  name="to"
                  value={s}
                  disabled={pending}
                  className={cn(
                    "min-h-12 px-5 text-[13.5px] font-extrabold disabled:opacity-60",
                    danger
                      ? "border-2 border-accent text-accent-700"
                      : "bg-accent text-bg hover:bg-accent-600",
                  )}
                >
                  {pending ? "Đang lưu…" : "→ " + labels[s]}
                </button>
              );
            })}
          </div>
        </form>
      )}
    </div>
  );
}
