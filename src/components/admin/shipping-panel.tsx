"use client";

import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { setShippingAction, type AdminActionState } from "@/app/admin/actions";

const CARRIERS = [
  { value: "GHN", label: "Giao Hàng Nhanh" },
  { value: "GHTK", label: "Giao Hàng Tiết Kiệm" },
  { value: "VIETTEL_POST", label: "Viettel Post" },
  { value: "STORE_PICKUP", label: "Nhận tại cửa hàng" },
];

/**
 * Nhập tay thông tin vận chuyển.
 *
 * Chưa nối API hãng vận chuyển, nên nhân viên bàn giao hàng xong thì gõ mã vận
 * đơn vào đây. Khách tra đơn ở storefront thấy ngay mã này — đó là toàn bộ lý
 * do khối tồn tại, và cũng là lý do server chặn chuyển sang "Đang giao" khi mã
 * còn trống.
 *
 * "Nhận tại cửa hàng" không có mã để tra nên được miễn.
 */
export function ShippingPanel({
  code,
  carrier,
  trackingCode,
  khoa,
}: {
  code: string;
  carrier: string | null;
  trackingCode: string | null;
  /** Đơn đã huỷ hoặc đã trả hàng thì không sửa vận chuyển nữa. */
  khoa: boolean;
}) {
  const [state, save, pending] = useActionState<AdminActionState, FormData>(setShippingAction, {});

  return (
    <div className="border-2 border-border-soft p-5">
      <p className="label-tech mb-2 font-bold">VẬN CHUYỂN</p>

      {khoa ? (
        <>
          <p className="text-[14px] font-semibold">
            {CARRIERS.find((c) => c.value === carrier)?.label ?? "Chưa chọn hãng"}
          </p>
          <p className="mt-0.5 font-mono text-[13px] text-muted">{trackingCode ?? "—"}</p>
          <p className="mt-3 border-t border-hairline pt-3 text-[12.5px] text-faint">
            Đơn đã chốt, không sửa vận chuyển nữa.
          </p>
        </>
      ) : (
        <>
          {state.message ? (
            <p
              role="alert"
              className={cn(
                "mb-3 text-[13px] font-semibold",
                state.ok ? "text-muted" : "text-accent-800",
              )}
            >
              {state.message}
            </p>
          ) : null}

          <form action={save} className="flex flex-col gap-3">
            <input type="hidden" name="code" value={code} />

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold">Đơn vị vận chuyển</span>
              <select name="carrier" defaultValue={carrier ?? ""} className={o}>
                <option value="">— Chưa chọn —</option>
                {CARRIERS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold">Mã vận đơn</span>
              <input
                name="trackingCode"
                defaultValue={trackingCode ?? ""}
                placeholder="GHN123456789"
                className={cn(o, "font-mono")}
              />
            </label>

            <button
              type="submit"
              disabled={pending}
              className="min-h-12 border-2 border-divider text-[13px] font-extrabold disabled:opacity-60"
            >
              {pending ? "Đang lưu…" : "LƯU VẬN CHUYỂN"}
            </button>
          </form>

          <p className="mt-3 text-[12px] leading-[1.6] text-faint">
            Khách tra đơn thấy mã này. Chưa có mã thì không chuyển sang Đang giao được, trừ khi
            nhận tại cửa hàng.
          </p>
        </>
      )}
    </div>
  );
}

const o =
  "w-full border border-border-soft bg-bg px-3 py-2.5 text-[16px] outline-none focus:border-accent lg:text-[13.5px]";
