"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import { datLaiAction, type DatLaiState } from "@/app/dat-lai-mat-khau/actions";

/** Đặt mật khẩu mới. Nhập hai lần, và tối thiểu 8 ký tự. */
export function ResetForm({ token }: { token: string }) {
  const [state, dat, pending] = useActionState<DatLaiState, FormData>(datLaiAction, {});

  return (
    <form action={dat} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      {state.message ? (
        <p
          role="alert"
          className="border-2 border-accent bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-800"
        >
          {state.message}
        </p>
      ) : null}

      <Field label="Mật khẩu mới" required hint="Tối thiểu 8 ký tự">
        <Input name="password" type="password" autoComplete="new-password" />
      </Field>

      <Field label="Nhập lại mật khẩu mới" required>
        <Input name="password2" type="password" autoComplete="new-password" />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 items-center justify-center bg-accent text-[15px] font-extrabold text-bg disabled:opacity-60"
      >
        {pending ? "Đang lưu…" : "ĐẶT MẬT KHẨU MỚI"}
      </button>
    </form>
  );
}
