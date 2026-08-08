"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/cn";
import { createCustomerAction, type NewCustomerState } from "@/app/admin/actions";

/**
 * Tạo tài khoản cho khách mua tại cửa hàng.
 *
 * Mật khẩu tạm hiện **đúng một lần** ngay sau khi tạo, để nhân viên đọc cho
 * khách. Không lưu bản rõ và không có màn nào xem lại — quên thì tạo mật khẩu
 * mới, chứ tra ra được mật khẩu cũ nghĩa là hệ thống đang giữ nó ở dạng đọc
 * được, thứ không nên có.
 */
export function NewCustomerForm() {
  const [state, save, pending] = useActionState<NewCustomerState, FormData>(
    createCustomerAction,
    {},
  );

  if (state.ok && state.matKhauTam) {
    return (
      <div className="max-w-[560px] border-2 border-divider bg-surface p-6">
        <h2 className="mb-3 text-[20px] font-extrabold">Đã tạo tài khoản</h2>
        <p className="mb-4 text-[14px] leading-[1.7] text-muted">
          Đọc mật khẩu tạm này cho khách. Màn hình này{" "}
          <strong className="text-text">không xem lại được</strong> — đóng đi là mất.
        </p>

        <div className="mb-5 border-2 border-accent bg-accent-100 px-5 py-4">
          <p className="label-tech mb-1.5 font-bold text-accent-800">MẬT KHẨU TẠM</p>
          <p className="font-mono text-[26px] font-bold tracking-[0.12em]">{state.matKhauTam}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {state.id ? (
            <Link
              href={("/admin/khach-hang/" + state.id) as Route}
              className="flex min-h-12 items-center bg-accent px-5 text-[13.5px] font-extrabold text-bg"
            >
              MỞ HỒ SƠ KHÁCH
            </Link>
          ) : null}
          <Link
            href="/admin/khach-hang"
            className="flex min-h-12 items-center border-2 border-divider px-5 text-[13.5px] font-extrabold"
          >
            Về danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={save} className="flex max-w-[560px] flex-col gap-4">
      {state.message ? (
        <p
          role="alert"
          className="border-2 border-accent bg-accent-100 px-4 py-3 text-[13.5px] font-semibold text-accent-800"
        >
          {state.message}
        </p>
      ) : null}

      <Row label="Tên khách hàng">
        <input name="name" required placeholder="Nguyễn Văn A" className={o} autoFocus />
      </Row>

      <Row label="Số điện thoại" hint="Dùng để đăng nhập">
        <input
          name="phone"
          required
          inputMode="numeric"
          placeholder="0903128447"
          className={cn(o, "font-mono")}
        />
      </Row>

      <Row label="Email" hint="Không bắt buộc">
        <input name="email" type="email" placeholder="khach@email.com" className={o} />
      </Row>

      <p className="border border-dashed border-border-soft bg-subtle px-4 py-3 text-[12.5px] leading-[1.6] text-muted">
        Hệ thống sinh một mật khẩu tạm và hiện ra một lần để bạn đọc cho khách. Khách đăng nhập
        bằng số điện thoại và mật khẩu đó.
      </p>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 bg-accent px-7 text-[14px] font-extrabold text-bg disabled:opacity-60"
        >
          {pending ? "Đang tạo…" : "TẠO TÀI KHOẢN"}
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
