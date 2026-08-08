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
        className="flex min-h-[52px] items-center border-2 border-divider bg-surface px-4 text-[14px] font-semibold"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={dangKy} className="flex flex-col gap-2">
      <div className="flex">
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
          className="min-w-0 flex-1 border border-border-soft border-r-0 bg-bg px-4 py-[15px] text-[14px] outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-divider px-6 py-[15px] text-[14px] font-extrabold text-bg disabled:opacity-60"
        >
          {pending ? "…" : "ĐĂNG KÝ"}
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
