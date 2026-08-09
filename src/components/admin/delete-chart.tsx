"use client";

import { useActionState } from "react";
import { xoaBangAction, type BangSizeState } from "@/app/admin/bang-size/actions";

/** Xoá bảng size. Server chặn nếu còn danh mục hoặc sản phẩm đang dùng. */
export function DeleteChart({ id }: { id: string }) {
  const [state, xoa, pending] = useActionState<BangSizeState, FormData>(xoaBangAction, {});

  return (
    <div className="text-right">
      <form
        action={xoa}
        onSubmit={(e) => {
          if (!confirm("Xoá bảng size này? Không lấy lại được.")) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-11 items-center border-2 border-divider px-4 text-[12.5px] font-extrabold disabled:opacity-60"
        >
          XOÁ BẢNG
        </button>
      </form>
      {state.message && !state.ok ? (
        <p role="alert" className="mt-2 max-w-[320px] text-[12.5px] font-semibold text-accent-800">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
