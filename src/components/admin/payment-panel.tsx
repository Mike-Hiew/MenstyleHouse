"use client";

import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { formatVnd } from "@/lib/money";
import { confirmTransferAction, type AdminActionState } from "@/app/admin/actions";

/**
 * Khối thanh toán ở chi tiết đơn.
 *
 * Chỉ đơn chuyển khoản còn chờ tiền mới hiện nút xác nhận. Nút này là chỗ duy
 * nhất đưa một đơn sang `PAID` bằng tay, nên nó bắt nhập ghi chú đối chiếu —
 * ba tháng sau còn biết ai xác nhận dựa trên cái gì.
 */
export function PaymentPanel({
  code,
  method,
  status,
  total,
  cancelled,
}: {
  code: string;
  method: string;
  status: string;
  total: number;
  cancelled: boolean;
}) {
  const [state, confirm, pending] = useActionState<AdminActionState, FormData>(
    confirmTransferAction,
    {},
  );

  const choTien = method === "BANK_TRANSFER" && status === "UNPAID" && !cancelled;

  return (
    <div className="border-2 border-border-soft p-5">
      <p className="label-tech mb-2 font-bold">THANH TOÁN</p>
      <p className="text-[14px] font-semibold">
        {method === "BANK_TRANSFER" ? "Chuyển khoản ngân hàng" : "Thanh toán khi nhận hàng"}
      </p>
      <p
        className={cn(
          "mt-0.5 text-[13px]",
          status === "PAID" ? "font-semibold" : "text-muted",
        )}
      >
        {status === "PAID" ? "Đã nhận đủ " + formatVnd(total) : "Chưa nhận tiền"}
      </p>

      {choTien ? (
        <>
          <p className="mt-3 border-t border-hairline pt-3 text-[12.5px] leading-[1.6] text-muted">
            Nội dung chuyển khoản khách dùng là mã đơn{" "}
            <strong className="font-mono">{code}</strong>. Đối chiếu sao kê trước khi xác nhận.
          </p>
          {state.message ? (
            <p
              role="alert"
              className={cn(
                "mt-3 text-[13px] font-semibold",
                state.ok ? "text-muted" : "text-accent-800",
              )}
            >
              {state.message}
            </p>
          ) : null}
          <form action={confirm} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="code" value={code} />
            <input
              name="note"
              placeholder="Mã giao dịch hoặc giờ tiền về"
              className="w-full border border-border-soft bg-bg px-3 py-2.5 text-[16px] outline-none focus:border-accent lg:text-[13.5px]"
            />
            <button
              type="submit"
              disabled={pending}
              className="min-h-12 bg-accent text-[13px] font-extrabold text-bg disabled:opacity-60"
            >
              {pending ? "Đang lưu…" : "XÁC NHẬN ĐÃ NHẬN TIỀN"}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
