"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Photo } from "@/components/ui/photo";
import { useProductColor } from "./product-stage";

type Shot = { id: string; url: string; alt: string; color?: string | null };

/** Độ phóng của kính lúp và đường kính (px), theo mockup v2. */
const ZOOM = 2.6;
const LOUPE = 200;

/**
 * Ảnh lớn + cột thumbnail 88px. Thumbnail là button nên tab và Enter đều dùng được.
 *
 * Bản v2 (mục 4, bật khi có `ProductColorProvider` bọc ngoài):
 * - Chỉ hiện ảnh của màu đang chọn cùng ảnh dùng chung (ảnh chưa gắn màu).
 *   Màu chưa có ảnh riêng thì hiện đủ bộ, không bao giờ để gallery trống.
 * - Đổi ảnh (bấm thumbnail hay đổi màu) thì ảnh mới hiện mờ dần đè lên ảnh cũ.
 * - Desktop có chuột: kính lúp tròn 200px phóng 2.6× theo con trỏ.
 */
export function ProductGallery({
  images,
  name,
  loupe = false,
}: {
  images: Shot[];
  name: string;
  /** Bật kính lúp (desktop, thiết bị có chuột). */
  loupe?: boolean;
}) {
  const stage = useProductColor();
  const color = stage?.color ?? null;

  const shown = React.useMemo(() => {
    if (!color) return images;
    const own = images.filter((i) => i.color === color);
    const shared = images.filter((i) => !i.color);
    // Ảnh của màu đứng trước, ảnh dùng chung theo sau.
    if (own.length > 0) return [...own, ...shared];
    return shared.length > 0 ? shared : images;
  }, [images, color]);

  const [active, setActive] = React.useState(0);
  // Đổi màu thì về ảnh đầu của bộ mới.
  React.useEffect(() => setActive(0), [color]);

  const current = shown[Math.min(active, shown.length - 1)];

  // Lớp ảnh trước đó, giữ lại trong lúc ảnh mới mờ dần lên trên. Tính ngay
  // trong lúc render (không đợi effect) để ảnh mới không loé lên một khung
  // hình trước khi bắt đầu mờ dần.
  const [prev, setPrev] = React.useState<Shot | null>(null);
  const [last, setLast] = React.useState<Shot | undefined>(current);
  if (current && last && current.url !== last.url) {
    setPrev(last);
    setLast(current);
  }

  if (images.length === 0 || !current) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-card bg-subtle text-[13px] text-muted">
        Chưa có ảnh sản phẩm
      </div>
    );
  }

  return (
    // Mobile: ảnh lớn trên, dải thumbnail cuộn ngang bên dưới.
    // Desktop: cột thumbnail cố định 88px bên trái như mockup.
    <div
      className={cn(
        "flex flex-col-reverse gap-3",
        shown.length > 1 && "lg:grid lg:grid-cols-[88px_1fr]",
      )}
    >
      {shown.length > 1 ? (
        <div
          className="flex gap-2.5 overflow-x-auto p-0.5 lg:flex-col"
          role="tablist"
          aria-label={"Ảnh " + name}
        >
          {shown.map((img, i) => (
            <button
              key={img.id}
              role="tab"
              aria-selected={img.id === current.id}
              aria-label={"Xem ảnh " + (i + 1)}
              onClick={() => setActive(i)}
              className={cn(
                "relative block aspect-[3/4] w-[68px] flex-none overflow-hidden rounded-xl bg-subtle transition-[opacity,box-shadow] lg:w-auto",
                img.id === current.id
                  ? "shadow-[0_0_0_2px_var(--color-text)]"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              <Photo src={img.url} alt="" sizes="(min-width: 1024px) 88px, 68px" />
            </button>
          ))}
        </div>
      ) : null}

      {/* `data-fly-source`: ảnh này được nhân bản để bay vào giỏ sau khi thêm hàng. */}
      <MainImage
        current={current}
        prev={prev}
        onFaded={() => setPrev(null)}
        loupe={loupe}
      />
    </div>
  );
}

function MainImage({
  current,
  prev,
  onFaded,
  loupe,
}: {
  current: Shot;
  prev: Shot | null;
  onFaded: () => void;
  loupe: boolean;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [lens, setLens] = React.useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );
  // Chỉ dựng ảnh phóng sau lần rê chuột đầu — khách mobile không tải thêm gì.
  const [armed, setArmed] = React.useState(false);
  const [fine, setFine] = React.useState(false);

  React.useEffect(() => {
    if (!loupe) return;
    const mq = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [loupe]);

  const on = loupe && fine;

  const move = (e: React.PointerEvent) => {
    if (!on || e.pointerType !== "mouse" || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    setArmed(true);
    setLens({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
  };

  return (
    <div
      ref={boxRef}
      data-fly-source
      onPointerMove={move}
      onPointerLeave={() => setLens(null)}
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden rounded-card bg-subtle",
        lens && "cursor-none",
      )}
    >
      {prev && prev.url !== current.url ? (
        <div className="absolute inset-0" aria-hidden>
          <Photo src={prev.url} alt="" sizes="(min-width: 1024px) 45vw, 100vw" />
        </div>
      ) : null}
      <div
        key={current.url}
        className={cn("absolute inset-0", prev && "motion-safe:animate-[fade-in_.45s_ease-out]")}
        onAnimationEnd={onFaded}
      >
        <Photo
          src={current.url}
          alt={current.alt}
          sizes="(min-width: 1024px) 45vw, 100vw"
          priority
        />
      </div>

      {on ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-4 right-4 z-[2] rounded-full bg-surface/70 px-3.5 py-2 text-[12.5px] font-semibold backdrop-blur-xl transition-opacity",
            lens ? "opacity-0" : "opacity-100",
          )}
        >
          Rê chuột để soi vải
        </span>
      ) : null}

      {on && armed ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute z-[5] overflow-hidden rounded-full bg-subtle",
            "shadow-[0_0_0_3px_rgba(255,255,255,.9),0_24px_50px_rgba(0,0,0,.35)]",
            "transition-[opacity,transform] duration-300 ease-[var(--ease-out-soft)]",
            lens ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
          style={{
            width: LOUPE,
            height: LOUPE,
            left: (lens?.x ?? 0) - LOUPE / 2,
            top: (lens?.y ?? 0) - LOUPE / 2,
          }}
        >
          {lens ? (
            <div
              className="absolute left-0 top-0"
              style={{
                width: lens.w * ZOOM,
                height: lens.h * ZOOM,
                transform: `translate(${LOUPE / 2 - lens.x * ZOOM}px, ${LOUPE / 2 - lens.y * ZOOM}px)`,
              }}
            >
              <Photo src={current.url} alt="" sizes="120vw" />
            </div>
          ) : null}
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-neutral-900/50 px-2.5 py-1 text-[11px] font-semibold text-bg backdrop-blur-md">
            Phóng {String(ZOOM).replace(".", ",")}×
          </span>
        </div>
      ) : null}
    </div>
  );
}
