"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { doiMatKhauAction, type TaiKhoanState } from "@/app/(tai-khoan)/tai-khoan-actions";

/** Đổi mật khẩu khi đang đăng nhập. Bắt nhập mật khẩu hiện tại. */
export function PasswordForm() {
  const [state, doi, pending] = useActionState<TaiKhoanState, FormData>(doiMatKhauAction, {});
  const err = (k: string) => state.errors?.[k];

  return (
    <form
      action={doi}
      // Đổi xong thì xoá trắng ba ô mật khẩu — `key` đổi buộc React dựng lại.
      key={state.ok ? "xong" : "dang-nhap-lieu"}
      className="grid max-w-[640px] gap-4 sm:grid-cols-2"
    >
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

      <div className="sm:col-span-2">
        <Field label="Mật khẩu hiện tại" required error={err("current")}>
          <Input name="current" type="password" autoComplete="current-password" />
        </Field>
      </div>

      <Field label="Mật khẩu mới" required error={err("password")} hint="Tối thiểu 8 ký tự">
        <Input name="password" type="password" autoComplete="new-password" />
      </Field>

      <Field label="Nhập lại mật khẩu mới" required error={err("password2")}>
        <Input name="password2" type="password" autoComplete="new-password" />
      </Field>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 items-center border-2 border-divider px-7 text-[14px] font-extrabold disabled:opacity-60"
        >
          {pending ? "Đang đổi…" : "ĐỔI MẬT KHẨU"}
        </button>
      </div>
    </form>
  );
}
