"use client";

import { useActionState } from "react";
import { taoBangAction, type BangSizeState } from "@/app/admin/bang-size/actions";

const o = "h-11 w-full border border-border-soft bg-surface px-3 text-[13.5px]";

/** Tạo bảng size mới. Tạo xong đi thẳng vào màn sửa để nhập các dòng. */
export function NewSizeChart() {
  const [state, tao, pending] = useActionState<BangSizeState, FormData>(taoBangAction, {});

  return (
    <form
      action={tao}
      className="mb-7 grid gap-3 border-2 border-border-soft p-4 sm:grid-cols-[1fr_1.4fr_auto]"
    >
      <p className="label-tech font-bold sm:col-span-3">TẠO BẢNG MỚI</p>

      {state.message ? (
        <p
          role="alert"
          className="border-2 border-accent bg-accent-100 px-3.5 py-2.5 text-[13px] font-semibold text-accent-800 sm:col-span-3"
        >
          {state.message}
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold">Tên bảng</span>
        <input name="name" placeholder="Bảng size áo khoác dày" className={o} />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold">Các cột</span>
        <input name="columns" defaultValue="Vòng ngực, Rộng vai, Dài áo, Gợi ý" className={o} />
      </label>

      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 items-center bg-accent px-6 text-[13px] font-extrabold text-bg disabled:opacity-60"
        >
          {pending ? "Đang tạo…" : "TẠO"}
        </button>
      </div>

      {/* Ghi chú form và hướng dẫn đo nhập ở màn sửa, sau khi đã có bảng. */}
      <input type="hidden" name="fit" value="" />
      <input type="hidden" name="howTo" value="" />
    </form>
  );
}
