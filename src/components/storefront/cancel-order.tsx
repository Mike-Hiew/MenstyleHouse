"use client";

import { useActionState } from "react";
import { huyDonAction, type HuyDonState } from "@/app/(tai-khoan)/tai-khoan-actions";

/** Khách tự huỷ đơn còn chờ xác nhận. Hỏi lại một câu vì huỷ là không lùi được. */
export function CancelOrderButton({ code }: { code: string }) {
  const [state, huy, pending] = useActionState<HuyDonState, FormData>(huyDonAction, {});

  if (state.ok) {
    return <span className="text-[12.5px] font-semibold text-muted">{state.message}</span>;
  }

  return (
    <form
      action={huy}
      onSubmit={(e) => {
        if (!confirm(`Huỷ đơn ${code}? Hàng sẽ được trả lại kho và không lấy lại đơn được.`)) {
          e.preventDefault();
        }
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="code" value={code} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 text-[12.5px] font-semibold text-accent-700 underline disabled:opacity-60 lg:min-h-0"
      >
        {pending ? "Đang huỷ…" : "Huỷ đơn"}
      </button>
      {state.message ? (
        <span role="alert" className="text-[12.5px] text-accent-800">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
