"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { traLoiAction, type TraLoiState } from "@/app/ho-tro/tra-cuu/actions";

/** Ô nhắn tiếp trong cùng yêu cầu — giữ mạch hội thoại thay vì mở yêu cầu mới. */
export function TicketReply({ code, daDong }: { code: string; daDong: boolean }) {
  const [state, gui, pending] = useActionState<TraLoiState, FormData>(traLoiAction, {});

  if (daDong) {
    return (
      <p className="mt-6 rounded-card bg-sand px-4 py-4 text-[13.5px] text-muted">
        Yêu cầu này đã đóng nên không nhắn tiếp được. Còn việc thì gửi yêu cầu mới, ghi kèm mã{" "}
        <span className="font-mono">{code}</span> để cửa hàng tra lại.
      </p>
    );
  }

  if (state.ok) {
    return (
      <p role="status" className="mt-6 px-4 py-4 text-[14px] font-semibold rounded-card bg-surface shadow-soft">
        {state.message}
      </p>
    );
  }

  return (
    <form action={gui} className="mt-6 grid gap-4 p-5 rounded-card bg-surface shadow-soft">
      <input type="hidden" name="code" value={code} />
      <p className="label-tech font-bold">NHẮN TIẾP</p>

      {state.message ? (
        <p role="alert" className="rounded-2xl bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-800">
          {state.message}
        </p>
      ) : null}

      <Field label="Tên của bạn" required error={state.errors?.authorName}>
        <Input name="authorName" autoComplete="name" />
      </Field>

      <Field label="Nội dung" required error={state.errors?.body}>
        <textarea
          name="body"
          rows={4}
          className="w-full px-4 py-2.5 text-[15px] outline-none lg:text-[14px] rounded-2xl bg-field transition-[background-color,box-shadow] focus:bg-surface focus:ring-4 focus:ring-ring"
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-fit items-center bg-accent px-7 text-[14px] font-semibold text-bg disabled:opacity-60 rounded-full justify-center transition-colors hover:bg-accent-600"
      >
        {pending ? "Đang gửi…" : "GỬI"}
      </button>
    </form>
  );
}
