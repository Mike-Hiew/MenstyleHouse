"use client";

import * as React from "react";
import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { saveCouponAction, type AdminActionState } from "@/app/admin/actions";

export type CouponFormData = {
  id: string;
  code: string;
  type: string;
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  memberOnly: boolean;
  startsAt: string;
  endsAt: string;
  active: boolean;
  usedCount: number;
};

/**
 * Tạo và sửa mã giảm giá.
 *
 * **Không có ô "lượt đã dùng".** Con số đó là số lần mã thực sự được tiêu trong
 * transaction đặt đơn; cho sửa tay là mở đường cho một mã giới hạn 100 lượt bị
 * dùng 300 lần mà sổ vẫn ghi 100. Nó hiện ra để đọc, ngay cạnh giới hạn.
 *
 * Khi sửa, ô **Mã** khoá luôn: mã đã phát ra ngoài rồi, đổi ký tự là làm chết
 * mã khách đang giữ trong tin nhắn.
 */
export function CouponForm({ coupon }: { coupon: CouponFormData | null }) {
  const [state, save, pending] = useActionState<AdminActionState, FormData>(saveCouponAction, {});
  const [type, setType] = React.useState(coupon?.type ?? "PERCENT");

  const suaDoi = coupon !== null;

  return (
    <form action={save} className="flex max-w-[760px] flex-col gap-4">
      {suaDoi ? <input type="hidden" name="id" value={coupon.id} /> : null}

      {state.message ? (
        <p
          role="alert"
          className={cn(
            "border-2 px-4 py-3 text-[13.5px] font-semibold",
            state.ok ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="Mã giảm giá" hint={suaDoi ? "Không đổi được sau khi tạo" : "Chữ in hoa và số"}>
          <input
            name="code"
            defaultValue={coupon?.code ?? ""}
            readOnly={suaDoi}
            required={!suaDoi}
            placeholder="CHAOBAN"
            className={cn(o, "font-mono uppercase", suaDoi && "bg-subtle text-muted")}
          />
        </Row>

        <Row label="Loại">
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={o}
          >
            <option value="PERCENT">Giảm %</option>
            <option value="FIXED">Giảm tiền</option>
            <option value="FREESHIP">Miễn phí ship</option>
          </select>
        </Row>

        <Row
          label={type === "PERCENT" ? "Giảm (%)" : type === "FIXED" ? "Giảm (₫)" : "Giá trị"}
          hint={type === "FREESHIP" ? "Không dùng cho miễn phí ship" : undefined}
        >
          <input
            name="value"
            inputMode="numeric"
            defaultValue={coupon?.value ?? (type === "PERCENT" ? 10 : 50000)}
            disabled={type === "FREESHIP"}
            className={cn(o, type === "FREESHIP" && "bg-subtle text-muted")}
          />
        </Row>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Đơn tối thiểu (₫)" hint="0 là không yêu cầu">
          <input
            name="minSubtotal"
            inputMode="numeric"
            defaultValue={coupon?.minSubtotal ?? 0}
            className={o}
          />
        </Row>
        <Row label="Giảm tối đa (₫)" hint="Để trống là không chặn trần">
          <input
            name="maxDiscount"
            inputMode="numeric"
            defaultValue={coupon?.maxDiscount ?? ""}
            className={o}
          />
        </Row>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="Giới hạn lượt dùng" hint="Để trống là không giới hạn">
          <input
            name="usageLimit"
            inputMode="numeric"
            defaultValue={coupon?.usageLimit ?? ""}
            className={o}
          />
        </Row>
        <Row label="Mỗi khách tối đa" hint="Để trống là không giới hạn">
          <input
            name="perUserLimit"
            inputMode="numeric"
            defaultValue={coupon?.perUserLimit ?? ""}
            className={o}
          />
        </Row>
        <Row label="Đã dùng" hint="Chỉ đọc — đếm từ đơn thật">
          <input
            value={coupon?.usedCount ?? 0}
            readOnly
            className={cn(o, "bg-subtle font-mono text-muted")}
          />
        </Row>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Bắt đầu">
          <input
            type="datetime-local"
            name="startsAt"
            defaultValue={coupon?.startsAt ?? ""}
            required
            className={o}
          />
        </Row>
        <Row label="Kết thúc">
          <input
            type="datetime-local"
            name="endsAt"
            defaultValue={coupon?.endsAt ?? ""}
            required
            className={o}
          />
        </Row>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
          <input
            type="checkbox"
            name="memberOnly"
            defaultChecked={coupon?.memberOnly ?? false}
            className="h-4 w-4 accent-accent"
          />
          Chỉ dành cho thành viên
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
          <input
            type="checkbox"
            name="active"
            defaultChecked={coupon?.active ?? true}
            className="h-4 w-4 accent-accent"
          />
          Đang bật
        </label>
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 bg-accent px-7 text-[14px] font-extrabold text-bg disabled:opacity-60"
        >
          {pending ? "Đang lưu…" : suaDoi ? "LƯU THAY ĐỔI" : "TẠO MÃ GIẢM GIÁ"}
        </button>
      </div>
    </form>
  );
}

const o =
  "w-full border border-border-soft bg-bg px-3.5 py-3 text-[16px] outline-none focus:border-accent lg:text-[14px]";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-faint">{hint}</span> : null}
    </label>
  );
}
