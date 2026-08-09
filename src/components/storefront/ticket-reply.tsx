"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { traLoiAction, type TraLoiState } from "@/app/ho-tro/tra-cuu/actions";

/** Ô nhắn tiếp trong cùng yêu cầu — giữ mạch hội thoại thay vì mở yêu cầu mới. */
export function TicketReply({ code, daDong }: { code: string; daDong: boolean }) {
  const [state, gui, pending] = useActionState<TraLoiState, FormData>(traLoiAction, {});

  if (daDong) {
    return (
      <p className="mt-6 border border-dashed border-border-soft bg-subtle px-4 py-4 text-[13.5px] text-muted">
        Yêu cầu này đã đóng nên không nhắn tiếp được. Còn việc thì gửi yêu cầu mới, ghi kèm mã{" "}
        <span className="font-mono">{code}</span> để cửa hàng tra lại.
      </p>
    );
  }

  if (state.ok) {
    return (
      <p role="status" className="mt-6 border-2 border-divider bg-surface px-4 py-4 text-[14px] font-semibold">
        {state.message}
      </p>
    );
  }

  return (
    <form action={gui} className="mt-6 grid gap-4 border-2 border-divider p-5">
      <input type="hidden" name="code" value={code} />
      <p className="label-tech font-bold">NHẮN TIẾP</p>

      {state.message ? (
        <p role="alert" className="border-2 border-accent bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-800">
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
          className="w-full border border-border-soft bg-surface px-3 py-2.5 text-[15px] outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent lg:text-[14px]"
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-fit items-center bg-accent px-7 text-[14px] font-extrabold text-bg disabled:opacity-60"
      >
        {pending ? "Đang gửi…" : "GỬI"}
      </button>
    </form>
  );
}
