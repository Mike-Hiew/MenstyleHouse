"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { luuHoSoAction, type TaiKhoanState } from "@/app/(tai-khoan)/tai-khoan-actions";

/** Tab "Hồ sơ": họ tên · số điện thoại · email — đúng `profileFields` của mockup. */
export function ProfileForm({ ban }: { ban: { name: string; phone: string; email: string } }) {
  const [state, luu, pending] = useActionState<TaiKhoanState, FormData>(luuHoSoAction, {});
  const cu = (k: keyof typeof ban) => state.values?.[k] ?? ban[k];
  const err = (k: string) => state.errors?.[k];

  return (
    <form action={luu} className="grid max-w-[640px] gap-4 sm:grid-cols-2">
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={
            "sm:col-span-2 border-2 px-4 py-3 text-[14px] font-semibold " +
            (state.ok ? "border-divider bg-surface" : "border-accent bg-accent-100 text-accent-800")
          }
        >
          {state.message}
        </p>
      ) : null}

      <Field label="Họ và tên" required error={err("name")}>
        <Input name="name" defaultValue={cu("name")} autoComplete="name" />
      </Field>

      <Field label="Số điện thoại" required error={err("phone")} hint="Cũng là tên đăng nhập">
        <Input name="phone" defaultValue={cu("phone")} inputMode="numeric" autoComplete="tel" />
      </Field>

      <div className="sm:col-span-2">
        <Field label="Email" error={err("email")} hint="Dùng để nhận xác nhận đơn và đặt lại mật khẩu">
          <Input name="email" type="email" defaultValue={cu("email")} autoComplete="email" />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 items-center bg-accent px-7 text-[14px] font-extrabold text-bg disabled:opacity-60"
        >
          {pending ? "Đang lưu…" : "LƯU THAY ĐỔI"}
        </button>
      </div>
    </form>
  );
}
