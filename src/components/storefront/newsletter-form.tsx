"use client";

import { useActionState } from "react";
import { dangKyNhanTinAction, type NhanTinState } from "@/app/actions-nhan-tin";

/** Ô nhận tin sale ở cuối trang chủ. Theo mockup: input liền nút, không bo góc. */
export function NewsletterForm() {
  const [state, dangKy, pending] = useActionState<NhanTinState, FormData>(
    dangKyNhanTinAction,
    {},
  );

  if (state.ok) {
    return (
      <p
        role="status"
        className="flex min-h-[52px] items-center px-4 text-[14px] font-semibold rounded-card bg-surface shadow-soft"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={dangKy} className="flex flex-col gap-2">
      <div className="flex rounded-full bg-field p-1.5 focus-within:bg-surface focus-within:ring-4 focus-within:ring-ring">
        <label htmlFor="nl" className="sr-only">
          Email của bạn
        </label>
        <input
          id="nl"
          name="email"
          type="email"
          placeholder="ban@email.com"
          // Giữ lại thứ vừa gõ: React 19 reset form sau mỗi lượt chạy action.
          defaultValue={state.email ?? ""}
          key={state.email ?? ""}
          className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-3 text-[14px] outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-neutral-900 px-6 py-3 text-[14px] font-semibold text-bg disabled:opacity-60"
        >
          {pending ? "…" : "Đăng ký"}
        </button>
      </div>
      {state.message ? (
        <p role="alert" className="text-[13px] font-semibold text-accent-800">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
