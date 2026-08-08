"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatVnd } from "@/lib/money";
import { removeCartItemAction, updateCartItemAction } from "@/app/gio-hang/actions";
import type { CartLine } from "@/server/cart";
import { Photo } from "@/components/ui/photo";

/**
 * Dòng giỏ theo mockup: ảnh 88×112, một dòng mono `SIZE · MÀU · SKU`, bộ đếm
 * và nút Xoá nằm cạnh nhau, thành tiền dồn phải. Bộ đếm cao 44px ở mobile để
 * đạt vùng chạm, thu về 34px từ `lg:` như mockup desktop.
 */
export function CartLines({ lines }: { lines: CartLine[] }) {
  const [pending, startTransition] = React.useTransition();

  const send = (action: typeof updateCartItemAction, itemId: string, qty?: number) => {
    const form = new FormData();
    form.set("itemId", itemId);
    if (qty !== undefined) form.set("qty", String(qty));
    startTransition(() => {
      void action(form);
    });
  };

  return (
    <ul className={cn("border-t border-hairline", pending && "opacity-60")} aria-busy={pending}>
      {lines.map((l) => (
        <li key={l.itemId} className="flex gap-4 border-b border-hairline py-4 lg:gap-[18px]">
          <Link
            href={{ pathname: "/san-pham/" + l.slug }}
            className="relative h-[112px] w-[88px] flex-none bg-subtle"
          >
            {l.imageUrl ? <Photo src={l.imageUrl} alt={l.productName} sizes="88px" /> : null}
          </Link>

          <div className="flex min-w-0 flex-1 flex-col">
            <Link
              href={{ pathname: "/san-pham/" + l.slug }}
              className="mb-1 text-[15px] font-semibold hover:text-accent-700"
            >
              {l.productName}
            </Link>
            <div className="label-tech mb-3.5">
              SIZE {l.size} · {l.color} · {l.sku}
            </div>

            {l.qty > l.stock ? (
              <p className="mb-2 text-[12.5px] font-semibold text-accent-700">
                Chỉ còn {l.stock} cái — số lượng sẽ được giảm khi đặt.
              </p>
            ) : null}

            <div className="mt-auto flex items-center gap-3.5">
              <div className="flex items-center border border-border-soft">
                <button
                  type="button"
                  aria-label={"Giảm số lượng " + l.productName}
                  disabled={pending}
                  onClick={() => send(updateCartItemAction, l.itemId, l.qty - 1)}
                  className="h-11 w-11 text-[16px] lg:h-[34px] lg:w-[34px]"
                >
                  −
                </button>
                <span className="w-8 text-center text-[13px] font-extrabold">{l.qty}</span>
                <button
                  type="button"
                  aria-label={"Tăng số lượng " + l.productName}
                  disabled={pending || l.qty >= l.stock}
                  onClick={() => send(updateCartItemAction, l.itemId, l.qty + 1)}
                  className="h-11 w-11 text-[16px] disabled:opacity-40 lg:h-[34px] lg:w-[34px]"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                aria-label={"Xoá " + l.productName + " khỏi giỏ"}
                disabled={pending}
                onClick={() => send(removeCartItemAction, l.itemId)}
                className="flex min-h-11 items-center text-[12.5px] text-faint underline lg:min-h-0"
              >
                Xoá
              </button>
            </div>
          </div>

          <div className="flex-none text-[16px] font-extrabold">{formatVnd(l.lineTotal)}</div>
        </li>
      ))}
    </ul>
  );
}
