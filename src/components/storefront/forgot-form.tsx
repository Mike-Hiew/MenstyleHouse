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
      <div className="border-2 border-divider bg-surface p-6">
        <h2 className="mb-3 text-[20px] font-extrabold">Đã gửi nếu tài khoản tồn tại</h2>
        <p className="mb-6 text-[14.5px] leading-[1.7] text-muted">{state.message}</p>
        <Link
          href={{ pathname: "/dang-nhap" }}
          className="flex min-h-12 w-fit items-center border-2 border-divider px-6 text-[14px] font-extrabold"
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
          className="border-2 border-accent bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-800"
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
        className="flex h-12 items-center justify-center bg-accent text-[15px] font-extrabold text-bg disabled:opacity-60"
      >
        {pending ? "Đang gửi…" : "GỬI ĐƯỜNG DẪN ĐẶT LẠI"}
      </button>

      <p className="text-[13.5px] text-muted">
        Nhớ ra rồi?{" "}
        <Link href={{ pathname: "/dang-nhap" }} className="font-semibold text-accent-700 underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
