"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatVnd } from "@/lib/money";
import { useOverlay } from "@/components/ui/overlay";
import { Photo } from "@/components/ui/photo";
import { CouponBox } from "./coupon-box";
import {
  readCartDrawerAction,
  removeCartItemAction,
  updateCartItemAction,
  type CartDrawerData,
} from "@/app/gio-hang/actions";

/**
 * Ngăn kéo giỏ hàng (mockup v2, mục 2).
 *
 * Không có giỏ phía client: giỏ nằm ở server (cookie `cartToken` + DB), nên
 * ngăn kéo chỉ đọc qua `readCartDrawerAction` và sửa bằng đúng các server
 * action mà trang `/gio-hang` đang dùng. Mỗi lần sửa xong thì đọc lại và
 * `router.refresh()` để số trên huy hiệu header khớp theo.
 */

type Ctx = {
  open: () => void;
  /**
   * Bay ảnh từ `source` về nút giỏ, nảy huy hiệu, rồi mở ngăn kéo. Đóng ngăn
   * kéo thì focus về `returnFocus` (nút vừa bấm).
   */
  afterAdd: (source: HTMLElement | null, returnFocus?: HTMLElement | null) => void;
  /** Đổi mỗi lần huy hiệu cần nảy — header dùng làm `key` cho animation. */
  bump: number;
};

const CartDrawerCtx = React.createContext<Ctx | null>(null);

/** `null` khi cờ tắt — nơi gọi rơi về hành vi cũ (link `/gio-hang`, toast). */
export function useCartDrawer() {
  return React.useContext(CartDrawerCtx);
}

const FLY_MS = 900;

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Header nổi (mục 7) nghe sự kiện này để hiện lại. */
export const SHOW_HEADER_EVENT = "msh:show-header";

/**
 * Nhân bản ảnh rồi cho bay theo đường cong về nút giỏ. Trả về promise xong khi
 * hạ cánh; không tìm thấy ảnh hoặc nút thì xong ngay.
 */
function flyToCart(source: HTMLElement | null): Promise<void> {
  window.dispatchEvent(new Event(SHOW_HEADER_EVENT));
  const target = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]")).find(
    (el) => el.offsetParent !== null,
  );
  if (!source || !target || reducedMotion()) return Promise.resolve();

  // Header nổi có thể đang trượt khuất: bay tới chỗ nó sẽ về (vị trí hiện
  // tại trừ đi đoạn đang dịch lên).
  const header = target.closest("header");
  const shift = header ? parseFloat(getComputedStyle(header).translate.split(" ")[1] ?? "") || 0 : 0;

  const from = source.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  const to = { left: r.left, top: r.top - shift, width: r.width, height: r.height };
  if (from.width === 0 || to.width === 0) return Promise.resolve();

  const clone = source.cloneNode(true) as HTMLElement;
  // Bản sao không được nhận focus hay bị đọc bởi trình đọc màn hình.
  clone.setAttribute("aria-hidden", "true");
  clone.removeAttribute("data-fly-source");
  Object.assign(clone.style, {
    position: "fixed",
    left: from.left + "px",
    top: from.top + "px",
    width: from.width + "px",
    height: from.height + "px",
    margin: "0",
    zIndex: "120",
    pointerEvents: "none",
    overflow: "hidden",
    borderRadius: "20px",
    boxShadow: "0 24px 50px rgba(0,0,0,.25)",
    transformOrigin: "0 0",
  });
  document.body.appendChild(clone);

  const scale = Math.max(0.08, (to.width * 0.9) / from.width);
  const dx = to.left + to.width / 2 - (from.left + (from.width * scale) / 2);
  const dy = to.top + to.height / 2 - (from.top + (from.height * scale) / 2);
  // Điểm giữa nhấc lên để thành vòng cung thay vì đường thẳng.
  const lift = Math.min(160, Math.abs(dy) * 0.5 + 80);

  const anim = clone.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      {
        transform: `translate(${dx * 0.55}px, ${dy * 0.55 - lift}px) scale(${(1 + scale) / 2.4})`,
        opacity: 1,
        offset: 0.55,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.2 },
    ],
    { duration: FLY_MS, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" },
  );

  return anim.finished.then(
    () => clone.remove(),
    () => clone.remove(),
  );
}

export function CartDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [bump, setBump] = React.useState(0);
  // Nút "Thêm vào giỏ" bị khoá trong lúc lưu nên mất focus trước khi ngăn kéo
  // mở; nhớ nó từ lúc bấm để đóng ngăn kéo xong trả focus về đúng chỗ.
  const returnTo = React.useRef<HTMLElement | null>(null);

  const ctx = React.useMemo<Ctx>(
    () => ({
      bump,
      open: () => setOpen(true),
      afterAdd: (source, returnFocus) => {
        returnTo.current = returnFocus ?? null;
        void flyToCart(source).then(() => {
          setBump((n) => n + 1);
          setOpen(true);
        });
      },
    }),
    [bump],
  );

  return (
    <CartDrawerCtx.Provider value={ctx}>
      {children}
      <CartDrawer
        open={open}
        onClose={() => {
          setOpen(false);
          const el = returnTo.current;
          returnTo.current = null;
          // Sau nhịp dọn của lớp phủ, để không bị nó trả focus đè lên.
          if (el) window.setTimeout(() => el.isConnected && el.focus({ preventScroll: true }), 0);
        }}
      />
    </CartDrawerCtx.Provider>
  );
}

function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = React.useState<CartDrawerData | null>(null);
  const [pending, startTransition] = React.useTransition();

  // Giữ panel trong DOM thêm một nhịp sau khi đóng để kịp trượt ra.
  const [mounted, setMounted] = React.useState(false);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), reducedMotion() ? 0 : 600);
    return () => window.clearTimeout(t);
  }, [open]);

  const load = React.useCallback(() => {
    startTransition(async () => {
      setData(await readCartDrawerAction());
    });
  }, []);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  const close = React.useCallback(() => onClose(), [onClose]);
  const panelRef = useOverlay(open && mounted, close);

  // Đổi số lượng / xoá / áp mã xong: đọc lại ngăn kéo và báo header đếm lại.
  const changed = React.useCallback(() => {
    load();
    router.refresh();
  }, [load, router]);

  const send = (action: typeof updateCartItemAction, itemId: string, qty?: number) => {
    const form = new FormData();
    form.set("itemId", itemId);
    if (qty !== undefined) form.set("qty", String(qty));
    startTransition(async () => {
      await action(form);
      setData(await readCartDrawerAction());
      router.refresh();
    });
  };

  if (!mounted) return null;

  const missing = data ? Math.max(0, data.freeShipFrom - data.payable) : 0;
  const progress = data && data.freeShipFrom > 0 ? Math.min(1, data.payable / data.freeShipFrom) : 1;

  return (
    <div className="fixed inset-0 z-90">
      <div
        aria-hidden
        onMouseDown={close}
        className={cn(
          "absolute inset-0 bg-scrim backdrop-blur-[var(--scrim-blur)] transition-opacity duration-500",
          shown ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Giỏ hàng"
        className={cn(
          "absolute bottom-2.5 right-2.5 top-2.5 flex w-[min(440px,calc(100%-20px))] flex-col rounded-[28px] bg-bg shadow-raised",
          "px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-[max(22px,env(safe-area-inset-top))]",
          "transition-transform duration-[600ms] ease-[var(--ease-out-soft)]",
          shown ? "translate-x-0" : "translate-x-[calc(100%+20px)]",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[28px] font-extrabold tracking-[-0.02em] [font-variation-settings:'wdth'_80]">
            Giỏ hàng
            {data && data.count > 0 ? (
              <span className="ml-2 text-[15px] font-semibold text-muted tabular-nums">
                {data.count}
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            aria-label="Đóng giỏ hàng"
            onClick={close}
            className="grid h-[42px] w-[42px] flex-none place-items-center rounded-full bg-field hover:bg-field-hover"
          >
            <X size={18} />
          </button>
        </div>

        {data === null ? (
          <p className="py-12 text-center text-[14px] text-muted" aria-busy>
            Đang tải giỏ hàng…
          </p>
        ) : data.lines.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-5 text-[14px] text-muted">Giỏ hàng đang trống.</p>
            <Link
              href="/san-pham"
              onClick={close}
              className="inline-flex h-12 items-center justify-center rounded-full bg-neutral-900 px-6 text-[14px] font-semibold text-bg"
            >
              Xem sản phẩm
            </Link>
          </div>
        ) : (
          <>
            {/* Thanh free ship: ngưỡng lấy từ cài đặt cửa hàng. */}
            <div className="mb-2 mt-4 rounded-[18px] bg-surface px-4 py-3.5 text-[13.5px]" aria-live="polite">
              {missing > 0 ? (
                <>
                  Mua thêm <strong className="tabular-nums">{formatVnd(missing)}</strong> để được
                  miễn phí giao hàng.
                </>
              ) : (
                <>Đơn của bạn được <strong>miễn phí giao hàng</strong>.</>
              )}
              <div
                className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-field"
                role="progressbar"
                aria-label="Tiến độ tới miễn phí giao hàng"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <i
                  className="block h-full rounded-full bg-accent transition-[width] duration-700 ease-[var(--ease-out-soft)]"
                  style={{ width: progress * 100 + "%" }}
                />
              </div>
            </div>

            <ul
              className={cn("-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 py-2", pending && "opacity-60")}
              aria-busy={pending}
            >
              {data.lines.map((l) => (
                <li
                  key={l.itemId}
                  className="grid grid-cols-[70px_1fr_auto] gap-3.5 rounded-[20px] bg-surface p-2.5 motion-safe:animate-[cart-in_.6s_var(--ease-out-soft)]"
                >
                  <Link
                    href={{ pathname: "/san-pham/" + l.slug }}
                    onClick={close}
                    className="relative aspect-[4/5] overflow-hidden rounded-xl bg-subtle"
                  >
                    {l.imageUrl ? <Photo src={l.imageUrl} alt={l.productName} sizes="70px" /> : null}
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={{ pathname: "/san-pham/" + l.slug }}
                      onClick={close}
                      className="block truncate text-[14px] font-semibold hover:text-muted"
                    >
                      {l.productName}
                    </Link>
                    <p className="mt-0.5 text-[12px] text-muted">
                      Size {l.size} · {l.color}
                    </p>
                    {l.qty > l.stock ? (
                      <p className="mt-0.5 text-[12px] font-semibold">Chỉ còn {l.stock} cái</p>
                    ) : null}
                    <div className="mt-2 flex w-max items-center rounded-full bg-field px-0.5">
                      <button
                        type="button"
                        aria-label={"Giảm số lượng " + l.productName}
                        disabled={pending}
                        onClick={() => send(updateCartItemAction, l.itemId, l.qty - 1)}
                        className="grid h-9 w-9 place-items-center rounded-full text-[15px] hover:bg-field-hover"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-[13px] font-bold tabular-nums">{l.qty}</span>
                      <button
                        type="button"
                        aria-label={"Tăng số lượng " + l.productName}
                        disabled={pending || l.qty >= l.stock}
                        onClick={() => send(updateCartItemAction, l.itemId, l.qty + 1)}
                        className="grid h-9 w-9 place-items-center rounded-full text-[15px] hover:bg-field-hover disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-[14px] font-bold tabular-nums">{formatVnd(l.lineTotal)}</span>
                    <button
                      type="button"
                      aria-label={"Xoá " + l.productName + " khỏi giỏ"}
                      disabled={pending}
                      onClick={() => send(removeCartItemAction, l.itemId)}
                      className="min-h-9 px-1 text-[12.5px] text-muted underline decoration-1 underline-offset-4 hover:text-text"
                    >
                      Xoá
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="pt-3">
              <CouponBox onApplied={changed} />

              <dl className="flex flex-col gap-2 text-[14px]">
                <div className="flex justify-between">
                  <dt className="text-muted">Tạm tính</dt>
                  <dd className="tabular-nums">{formatVnd(data.subtotal)}</dd>
                </div>
                {data.coupon ? (
                  <div className="flex justify-between">
                    <dt className="text-muted">Giảm giá ({data.coupon.code})</dt>
                    <dd className="tabular-nums">−{formatVnd(data.coupon.discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-muted">Phí vận chuyển</dt>
                  <dd>{missing === 0 ? "Miễn phí" : "Tính ở bước sau"}</dd>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <dt className="text-[15px] font-semibold">Tổng cộng</dt>
                  <dd className="text-[24px] font-extrabold tracking-[-0.02em] tabular-nums">
                    {formatVnd(data.payable)}
                  </dd>
                </div>
              </dl>

              <p className="mb-3 mt-2 text-[12.5px] text-muted">
                Đơn này tích được <strong className="text-text">{data.points} điểm</strong> nếu bạn có
                tài khoản.
              </p>

              <Link
                href="/thanh-toan"
                onClick={close}
                className="flex h-[52px] w-full items-center justify-center rounded-full bg-accent px-6 text-[15px] font-semibold text-bg transition-[background-color,box-shadow] hover:bg-accent-600 hover:shadow-raised"
              >
                Thanh toán
              </Link>
              <Link
                href="/gio-hang"
                onClick={close}
                className="mt-1 flex h-11 w-full items-center justify-center text-[13px] font-semibold text-muted hover:text-text"
              >
                Xem giỏ hàng
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
