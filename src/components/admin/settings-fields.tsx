"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import type { AdminActionState } from "@/app/admin/actions";

/**
 * Mấy mảnh dùng chung của bốn trang Cài đặt.
 *
 * Trước M6.20 chúng nằm cuối `settings-form.tsx` — hợp lý khi chỉ có một form.
 * Giờ mỗi mục là một trang riêng nên tách ra đây, giữ nguyên hình dạng và lớp
 * CSS: đây là bước dọn chỗ, không phải dịp vẽ lại giao diện.
 */

export const oNhap =
  "w-full border border-border-soft bg-bg px-3.5 py-3 text-[16px] outline-none focus:border-accent lg:text-[14px]";

export function Nhom({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t-2 border-divider pt-3.5">
      <h2 className="mb-3.5 text-[19px]">{title}</h2>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

export function O({
  label,
  name,
  defaultValue,
  value,
  onChange,
  hint,
  so,
  mono,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  value?: number;
  onChange?: (v: number) => void;
  hint?: string;
  so?: boolean;
  mono?: boolean;
}) {
  const dieuKhien = value !== undefined && onChange;
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold">{label}</span>
      <input
        name={name}
        inputMode={so ? "numeric" : undefined}
        {...(dieuKhien
          ? {
              value,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(Number(e.target.value) || 0),
            }
          : { defaultValue })}
        className={cn(oNhap, mono && "font-mono")}
      />
      {hint ? <span className="mt-1 block text-[12px] leading-[1.6] text-faint">{hint}</span> : null}
    </label>
  );
}

/** Thông báo sau khi lưu. Đặt ngay đầu form của từng trang. */
export function Bao({ state }: { state: AdminActionState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "border-2 px-4 py-3 text-[13.5px] font-semibold",
        state.ok ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
      )}
    >
      {state.message}
    </p>
  );
}

export function NutLuu({ pending }: { pending: boolean }) {
  return (
    <div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 bg-accent px-7 text-[14px] font-extrabold text-bg disabled:opacity-60"
      >
        {pending ? "Đang lưu…" : "LƯU"}
      </button>
    </div>
  );
}
