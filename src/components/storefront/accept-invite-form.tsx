"use client";

import { useActionState } from "react";
import { acceptInviteAction, type AcceptState } from "@/app/nhan-loi-moi/actions";

/**
 * Người được mời tự đặt mật khẩu.
 *
 * Email không sửa được: nó là thứ lời mời được phát ra, đổi ở đây là mời một
 * người rồi để người khác nhận.
 */
export function AcceptInviteForm({ token }: { token: string }) {
  const [state, nhan, pending] = useActionState<AcceptState, FormData>(acceptInviteAction, {});

  return (
    <form action={nhan} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      {state.message ? (
        <p
          role="alert"
          className="border-2 border-accent bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-800"
        >
          {state.message}
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold">Họ và tên</span>
        <input name="name" required placeholder="Nguyễn Văn A" className={o} autoFocus />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold">Mật khẩu</span>
        <input name="password" type="password" required minLength={8} className={o} />
        <span className="mt-1 block text-[12px] text-faint">Tối thiểu 8 ký tự</span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold">Nhập lại mật khẩu</span>
        <input name="password2" type="password" required minLength={8} className={o} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-12 bg-accent text-[14px] font-extrabold text-bg disabled:opacity-60 sm:w-fit sm:px-10"
      >
        {pending ? "Đang tạo…" : "TẠO TÀI KHOẢN"}
      </button>
    </form>
  );
}

const o =
  "w-full border border-border-soft bg-bg px-3.5 py-3 text-[16px] outline-none focus:border-accent lg:text-[14px]";
