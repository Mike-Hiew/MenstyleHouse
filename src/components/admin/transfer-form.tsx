"use client";

import * as React from "react";
import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { chuyenKhoAction, type ChuyenKhoState } from "@/app/admin/ton-kho/actions";

export type Kho = { id: string; name: string; qty: number };

/**
 * Chuyển hàng giữa hai kho.
 *
 * Gập lại mặc định: đây là việc thỉnh thoảng mới làm, bày sẵn một form giữa
 * trang sổ kho thì lần nào mở sổ cũng phải cuộn qua nó.
 */
export function TransferForm({ variantId, kho }: { variantId: string; kho: Kho[] }) {
  const [mo, setMo] = React.useState(false);
  const [state, gui, pending] = useActionState<ChuyenKhoState, FormData>(chuyenKhoAction, {});

  React.useEffect(() => {
    if (state.ok) setMo(false);
  }, [state.ok]);

  if (kho.length < 2) {
    return (
      <p className="mt-5 text-[13px] text-muted">
        Cửa hàng chỉ có một kho nên không có gì để chuyển.
      </p>
    );
  }

  if (!mo) {
    return (
      <div className="mt-5">
        {state.message ? (
          <p
            role={state.ok ? "status" : "alert"}
            className="mb-3 border-2 border-divider bg-surface px-3.5 py-2.5 text-[13px] font-semibold"
          >
            {state.message}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setMo(true)}
          className="flex min-h-11 items-center border-2 border-divider px-5 text-[13px] font-extrabold"
        >
          CHUYỂN KHO
        </button>
      </div>
    );
  }

  const coHang = kho.filter((k) => k.qty > 0);

  return (
    <form action={gui} className="mt-5 grid gap-4 border-2 border-divider p-5 sm:grid-cols-4">
      <input type="hidden" name="variantId" value={variantId} />

      {state.message && !state.ok ? (
        <p role="alert" className="border-2 border-accent bg-accent-100 px-3.5 py-2.5 text-[13px] font-semibold text-accent-800 sm:col-span-4">
          {state.message}
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold">Từ kho</span>
        <select name="tuKho" className={o} defaultValue={coHang[0]?.id ?? kho[0].id}>
          {kho.map((k) => (
            <option key={k.id} value={k.id} disabled={k.qty <= 0}>
              {k.name} ({k.qty})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold">Đến kho</span>
        <select name="denKho" className={o} defaultValue={kho.find((k) => k.id !== coHang[0]?.id)?.id}>
          {kho.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name} ({k.qty})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold">Số lượng</span>
        <input name="soLuong" inputMode="numeric" defaultValue={1} className={o} />
      </label>

      <div className="flex items-end gap-2">
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "flex h-11 items-center bg-accent px-5 text-[13px] font-extrabold text-bg",
            pending && "opacity-60",
          )}
        >
          {pending ? "Đang chuyển…" : "CHUYỂN"}
        </button>
        <button
          type="button"
          onClick={() => setMo(false)}
          className="flex h-11 items-center border border-border-soft px-4 text-[13px] font-extrabold"
        >
          Thôi
        </button>
      </div>
    </form>
  );
}

const o = "h-11 w-full border border-border-soft bg-surface px-3 text-[13.5px]";
