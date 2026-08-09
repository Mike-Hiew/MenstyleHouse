"use client";

import * as React from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { KY, type KyKey } from "@/lib/ky-bao-cao";

/**
 * Chọn khoảng thời gian cho báo cáo.
 *
 * Ghi vào URL chứ không giữ trong state: kế toán gửi link "quý này" cho chủ
 * cửa hàng thì người kia mở ra phải thấy đúng quý đó.
 */
export function KyPicker({ ky, tu, den }: { ky: KyKey; tu: string; den: string }) {
  const router = useRouter();
  const [dangChuyen, batDau] = React.useTransition();

  const di = (q: Record<string, string>) => {
    const sp = new URLSearchParams(q);
    batDau(() => router.push(("/admin/bao-cao?" + sp.toString()) as Route, { scroll: false }));
  };

  return (
    <div className={cn("mb-5 flex flex-wrap items-center gap-2", dangChuyen && "opacity-60")}>
      {(Object.keys(KY) as KyKey[]).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={ky === k}
          onClick={() => di(k === "tuy" ? { ky: k, tu, den } : { ky: k })}
          className={cn(
            "flex min-h-11 items-center border px-3.5 text-[12.5px] font-extrabold",
            ky === k ? "border-divider bg-neutral-900 text-bg" : "border-border-soft hover:bg-subtle",
          )}
        >
          {KY[k]}
        </button>
      ))}

      {ky === "tuy" ? (
        <span className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="Từ ngày"
            defaultValue={tu}
            onChange={(e) => di({ ky: "tuy", tu: e.target.value, den })}
            className="h-11 border border-border-soft bg-surface px-2.5 text-[13px]"
          />
          <span className="text-faint" aria-hidden>
            —
          </span>
          <input
            type="date"
            aria-label="Đến ngày"
            defaultValue={den}
            onChange={(e) => di({ ky: "tuy", tu, den: e.target.value })}
            className="h-11 border border-border-soft bg-surface px-2.5 text-[13px]"
          />
        </span>
      ) : null}
    </div>
  );
}
