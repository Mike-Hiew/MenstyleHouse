"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatVnd } from "@/lib/money";
import { Photo } from "@/components/ui/photo";
import { useToast } from "@/components/ui/toast";
import { addManyToCartAction, addToCartAction } from "@/app/gio-hang/actions";
import type { Look } from "@/server/home";
import { useCartDrawer } from "./cart-drawer";

/**
 * "Mặc thử nguyên bộ" (mục 5, mockup v2): ảnh lookbook có điểm chấm trên từng
 * món, bấm điểm chấm mở thẻ kính nhỏ có nút "+ Thêm"; bên cạnh là danh sách
 * món có công tắc chọn/bỏ, tổng tiền chạy số, và nút "Thêm cả bộ vào giỏ".
 *
 * Thêm hàng đi qua đúng server action của giỏ, nên ngăn kéo giỏ và hiệu ứng
 * bay vào giỏ hoạt động y như ở trang sản phẩm.
 */
export function ShopTheLook({ look }: { look: Look }) {
  const toast = useToast();
  const drawer = useCartDrawer();
  const [pending, start] = React.useTransition();
  const photoRef = React.useRef<HTMLDivElement>(null);

  // Mặc định chọn mọi món còn hàng.
  const [picked, setPicked] = React.useState<Set<string>>(
    () => new Set(look.items.filter((i) => i.stock > 0).map((i) => i.variantId)),
  );
  const [open, setOpen] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const total = look.items.filter((i) => picked.has(i.variantId)).reduce((s, i) => s + i.price, 0);
  const shown = useCountUp(total);

  const toggle = (id: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const done = (el: HTMLElement | null) => {
    if (drawer) drawer.afterAdd(photoRef.current, el);
    else toast("Đã thêm vào giỏ.");
  };

  const addOne = (variantId: string, el: HTMLElement) => {
    const form = new FormData();
    form.set("variantId", variantId);
    form.set("qty", "1");
    start(async () => {
      const res = await addToCartAction(form);
      if (!res.ok) return toast(res.message, "error");
      setOpen(null);
      done(el);
    });
  };

  const addAll = (el: HTMLElement) => {
    start(async () => {
      const res = await addManyToCartAction([...picked]);
      if (!res.ok) return toast(res.message, "error");
      if (res.skipped > 0) toast(`Đã thêm ${res.added} món, ${res.skipped} món đang hết hàng.`);
      done(el);
    });
  };

  return (
    <div className="grid gap-7 rounded-[36px] bg-sand p-3 lg:grid-cols-[7fr_5fr] lg:p-7">
      <div
        ref={photoRef}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-card bg-stone"
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
      >
        {look.image ? (
          <Photo src={look.image.url} alt={look.image.alt} sizes="(min-width: 1024px) 55vw, 100vw" />
        ) : null}

        {look.items.map((it) => {
          const isOpen = open === it.variantId;
          // Điểm chấm ở nửa phải thì thẻ mở sang trái, để không tràn khỏi ảnh.
          const left = it.x > 55;
          return (
            <React.Fragment key={it.variantId}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={"Xem " + it.name}
                onClick={() => setOpen(isOpen ? null : it.variantId)}
                className={cn(
                  "absolute z-[3] -ml-[19px] -mt-[19px] grid h-[38px] w-[38px] place-items-center rounded-full bg-surface/95 shadow-[0_6px_20px_rgba(0,0,0,.18)] transition-transform duration-300 hover:scale-110",
                  "before:absolute before:-inset-[9px] before:rounded-full before:bg-surface/35 motion-safe:before:animate-[ping-soft_2.2s_ease_infinite]",
                  isOpen && "scale-110",
                )}
                style={{ left: it.x + "%", top: it.y + "%" }}
              >
                <i
                  className={cn(
                    "block h-[9px] w-[9px] rounded-full transition-colors",
                    isOpen ? "bg-accent" : "bg-neutral-900",
                  )}
                />
              </button>

              {isOpen ? (
                <div
                  role="dialog"
                  aria-label={it.name}
                  className="absolute z-[4] flex w-[250px] max-w-[calc(100%-24px)] items-center gap-3 rounded-[20px] bg-surface/75 p-2.5 shadow-raised backdrop-blur-xl motion-safe:animate-[pop-in_.4s_var(--ease-out-soft)]"
                  style={{
                    top: `calc(${it.y}% + 28px)`,
                    ...(left ? { right: `calc(${100 - it.x}% - 30px)` } : { left: `calc(${it.x}% - 30px)` }),
                  }}
                >
                  <div className="relative h-[70px] w-[58px] flex-none overflow-hidden rounded-xl bg-subtle">
                    {it.imageUrl ? <Photo src={it.imageUrl} alt="" sizes="58px" /> : null}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={{ pathname: "/san-pham/" + it.slug }}
                      className="block truncate text-[14px] font-semibold leading-tight hover:text-muted"
                    >
                      {it.name}
                    </Link>
                    <span className="text-[12.5px] text-muted">
                      {formatVnd(it.price)} · {it.size}
                    </span>
                    <button
                      type="button"
                      disabled={pending || it.stock === 0}
                      onClick={(e) => addOne(it.variantId, e.currentTarget)}
                      className="mt-2 flex items-center gap-1 rounded-full bg-neutral-900 px-3 py-[7px] text-[12px] font-semibold text-bg"
                    >
                      {it.stock === 0 ? (
                        "Hết hàng"
                      ) : (
                        <>
                          <Plus size={13} aria-hidden /> Thêm
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5 px-1 pb-2 pt-1 lg:py-2">
        <h3 className="mb-1 mt-1 text-[22px] font-bold">{look.title}</h3>
        <p className="mb-2 text-[13.5px] text-muted">{look.note}</p>

        <ul className="flex flex-col gap-2.5">
          {look.items.map((it) => {
            const on = picked.has(it.variantId);
            const out = it.stock === 0;
            return (
              <li key={it.variantId}>
                <label
                  className={cn(
                    "grid cursor-pointer grid-cols-[60px_1fr_auto] items-center gap-3 rounded-[20px] p-2.5 pr-4 transition-[background-color,box-shadow,opacity,transform] duration-300 lg:grid-cols-[76px_1fr_auto] lg:gap-4",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                    open === it.variantId
                      ? "translate-x-1 bg-surface shadow-soft"
                      : "bg-surface/55 hover:bg-surface hover:shadow-soft",
                    (!on || out) && "opacity-45",
                    out && "cursor-not-allowed",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on && !out}
                    disabled={out}
                    onChange={() => toggle(it.variantId)}
                    className="sr-only"
                  />
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-subtle">
                    {it.imageUrl ? <Photo src={it.imageUrl} alt="" sizes="76px" /> : null}
                  </div>
                  <div className="min-w-0">
                    <b className="block truncate text-[15px] font-semibold">{it.name}</b>
                    <span className="text-[12.5px] text-muted">
                      {out ? "Hết hàng" : `${it.color} · Size ${it.size} · ${formatVnd(it.price)}`}
                    </span>
                  </div>
                  <span
                    aria-hidden
                    className={cn(
                      "grid h-[26px] w-[26px] place-items-center rounded-full transition-[background-color,transform] duration-300",
                      on && !out ? "bg-neutral-900 text-bg" : "scale-[0.85] bg-field text-transparent",
                    )}
                  >
                    <Check size={14} strokeWidth={3} />
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto flex items-baseline justify-between px-1.5 pb-1 pt-4">
          <span className="text-muted">{picked.size} món</span>
          <b
            className="text-[30px] font-extrabold tracking-[-0.03em] tabular-nums [font-variation-settings:'wdth'_75] lg:text-[40px]"
            aria-live="polite"
          >
            {formatVnd(shown)}
          </b>
        </div>
        <button
          type="button"
          disabled={pending || picked.size === 0}
          onClick={(e) => addAll(e.currentTarget)}
          className="flex h-[52px] w-full items-center justify-center rounded-full bg-accent px-6 text-[15px] font-semibold text-bg transition-[background-color,box-shadow,transform] hover:bg-accent-600 hover:shadow-raised active:scale-[0.97]"
        >
          {pending ? "Đang thêm…" : "Thêm cả bộ vào giỏ"}
        </button>
      </div>
    </div>
  );
}

/** Số chạy tới giá trị mới trong ~0,6s. Bỏ hiệu ứng khi khách giảm chuyển động. */
function useCountUp(value: number) {
  const [shown, setShown] = React.useState(value);
  const from = React.useRef(value);
  // Bị ngắt giữa chừng (đổi lựa chọn liên tiếp) thì chạy tiếp từ số đang hiện.
  const current = React.useRef(value);
  current.current = shown;

  React.useEffect(() => {
    const start = from.current;
    if (start === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round((start + (value - start) * eased) / 1000) * 1000;
      setShown(k === 1 ? value : v);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = current.current;
    };
  }, [value]);

  return shown;
}
