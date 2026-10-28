"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/input";
import { quenMatKhauAction, type QuenState } from "@/app/quen-mat-khau/actions";

/**
 * Xin đường dẫn đặt lại mật khẩu.
 *
 * Gửi xong hiện **đúng một câu**, không phân biệt tài khoản có tồn tại hay
 * không — xem lý do ở `src/app/quen-mat-khau/actions.ts`.
 */
export function ForgotForm() {
  const [state, gui, pending] = useActionState<QuenState, FormData>(quenMatKhauAction, {});

  if (state.ok) {
    return (
      <div className="p-6 rounded-card bg-surface shadow-soft">
        <h2 className="mb-3 text-[20px] font-extrabold">Đã gửi nếu tài khoản tồn tại</h2>
        <p className="mb-6 text-[14.5px] leading-[1.7] text-muted">{state.message}</p>
        <Link
          href={{ pathname: "/dang-nhap" }}
          className="flex min-h-12 w-fit items-center px-6 text-[14px] font-extrabold rounded-full bg-field hover:bg-field-hover"
        >
          Về trang đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <form action={gui} className="flex flex-col gap-4">
      {state.message ? (
        <p
          role="alert"
          className="rounded-2xl bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-800"
        >
          {state.message}
        </p>
      ) : null}

      <Field
        label="Số điện thoại hoặc email"
        required
        hint="Đường dẫn đặt lại sẽ gửi tới email của tài khoản"
      >
        <Input name="dinhDanh" autoComplete="username" placeholder="0903128447 hoặc ban@email.com" />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 items-center justify-center bg-accent text-[15px] font-semibold text-bg disabled:opacity-60 rounded-full transition-colors hover:bg-accent-600"
      >
        {pending ? "Đang gửi…" : "GỬI ĐƯỜNG DẪN ĐẶT LẠI"}
      </button>

      <p className="text-[13.5px] text-muted">
        Nhớ ra rồi?{" "}
        <Link href={{ pathname: "/dang-nhap" }} className="font-semibold underline decoration-1 underline-offset-4">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
