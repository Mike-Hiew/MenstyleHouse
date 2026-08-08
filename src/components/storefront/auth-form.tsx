"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/input";
import { loginAction, registerAction, type AuthState } from "@/app/(tai-khoan)/actions";

/**
 * Form đăng ký và đăng nhập dùng chung một khung. Đăng nhập **không bắt buộc**
 * để mua hàng — mọi màn đều nhắc lại điều đó.
 */
export function AuthForm({ mode }: { mode: "dang-ky" | "dang-nhap" }) {
  const isRegister = mode === "dang-ky";
  const [state, action, pending] = useActionState<AuthState, FormData>(
    isRegister ? registerAction : loginAction,
    {},
  );

  const err = (name: string) => state.errors?.[name];
  const cu = (name: string) => state.values?.[name] ?? "";

  return (
    /*
     * `key` đổi theo dữ liệu trả về để React dựng lại các input không điều
     * khiển với `defaultValue` mới — nếu không, React 19 reset form xong là
     * mọi ô trắng trơn dù server đã trả lại đúng những gì khách vừa gõ.
     */
    <form
      key={JSON.stringify(state.values ?? {})}
      action={action}
      className="flex max-w-[420px] flex-col gap-4"
    >
      {state.message ? (
        <p
          role="alert"
          className="border-2 border-accent bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-800"
        >
          {state.message}
        </p>
      ) : null}

      {isRegister ? (
        <Field label="Họ tên" required error={err("name")}>
          <Input
            name="name"
            autoComplete="name"
            placeholder="Nguyễn Minh Hiếu"
            defaultValue={cu("name")}
          />
        </Field>
      ) : null}

      <Field
        label={isRegister ? "Số điện thoại" : "Số điện thoại hoặc email"}
        required
        error={err("phone")}
        hint={isRegister ? "10 số, bắt đầu bằng 0" : "Nhân viên được mời qua email thì dùng email"}
      >
        <Input
          name="phone"
          inputMode={isRegister ? "numeric" : "text"}
          autoComplete={isRegister ? "tel" : "username"}
          placeholder={isRegister ? "0903128447" : "0903128447 hoặc ban@email.com"}
          defaultValue={cu("phone")}
        />
      </Field>

      {isRegister ? (
        <Field label="Email" error={err("email")} hint="Không bắt buộc">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="ban@email.com"
            defaultValue={cu("email")}
          />
        </Field>
      ) : null}

      <Field
        label="Mật khẩu"
        required
        error={err("password")}
        hint={isRegister ? "Tối thiểu 6 ký tự" : undefined}
      >
        <Input
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
        />
      </Field>

      {isRegister ? (
        <Field label="Nhập lại mật khẩu" required error={err("password2")}>
          <Input name="password2" type="password" autoComplete="new-password" />
        </Field>
      ) : (
        <p className="-mt-1 text-[13px]">
          <Link href={{ pathname: "/quen-mat-khau" }} className="text-accent-700 underline">
            Quên mật khẩu?
          </Link>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 items-center justify-center bg-accent text-[15px] font-extrabold text-bg disabled:opacity-60"
      >
        {pending ? "Đang xử lý…" : isRegister ? "ĐĂNG KÝ — TẶNG 100 ĐIỂM" : "ĐĂNG NHẬP"}
      </button>

      <p className="text-[13.5px] text-muted">
        {isRegister ? (
          <>
            Đã có tài khoản?{" "}
            <Link href={{ pathname: "/dang-nhap" }} className="font-extrabold text-accent-700 underline">
              Đăng nhập
            </Link>
          </>
        ) : (
          <>
            Chưa có tài khoản?{" "}
            <Link href={{ pathname: "/dang-ky" }} className="font-extrabold text-accent-700 underline">
              Đăng ký
            </Link>
          </>
        )}
      </p>

      <p className="text-[12.5px] text-faint">
        Bạn vẫn mua hàng được mà không cần tài khoản.{" "}
        <Link href="/san-pham" className="underline">
          Tiếp tục mua với tư cách khách
        </Link>
        .
      </p>
    </form>
  );
}
