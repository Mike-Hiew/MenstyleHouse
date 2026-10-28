"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProductCardData } from "@/server/catalog";
import { ProductCard } from "./product-card";

/**
 * Dải sản phẩm cuộn ngang (mục 5, "Mới về tuần này"): cuộn có điểm dừng theo
 * từng thẻ, kéo bằng chuột trên desktop, nút trước/sau. Trên điện thoại là
 * cuộn ngang bằng ngón tay như bình thường.
 *
 * Dùng lại nguyên `ProductCard`, chỉ đặt bề ngang cố định cho từng ô.
 */
export function ProductRail({
  products,
  title,
  moreHref,
}: {
  products: ProductCardData[];
  title: string;
  /** Đích của link "Xem tất cả →" đặt cạnh nút trước/sau. */
  moreHref?: Route;
}) {
  const railRef = React.useRef<HTMLDivElement>(null);
  const [edge, setEdge] = React.useState({ start: true, end: false });

  const updateEdge = React.useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  React.useEffect(() => {
    updateEdge();
    window.addEventListener("resize", updateEdge);
    return () => window.removeEventListener("resize", updateEdge);
  }, [updateEdge]);

  const step = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-rail-item]");
    const w = card ? card.offsetWidth + 18 : el.clientWidth * 0.8;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * w, behavior: reduce ? "auto" : "smooth" });
  };

  // Kéo bằng chuột. Kéo quá 6px thì chặn cú click ngay sau đó, để thả chuột
  // trên một thẻ không mở luôn trang sản phẩm.
  const drag = React.useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const justDragged = React.useRef(false);
  const [dragging, setDragging] = React.useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !railRef.current) return;
    drag.current = { x: e.clientX, left: railRef.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = railRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      setDragging(true);
      el.setPointerCapture(e.pointerId);
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    railRef.current?.releasePointerCapture(e.pointerId);
    // Thả xong mới bật lại điểm dừng, để thẻ hít vào đúng chỗ.
    setDragging(false);
    // Cú click đến ngay sau pointerup — chặn đúng cú đó rồi thôi.
    justDragged.current = true;
    window.setTimeout(() => (justDragged.current = false), 0);
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (justDragged.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <section aria-labelledby="rail-title">
      <div className="mx-auto mb-6 flex max-w-[1360px] items-end justify-between gap-4 px-4 lg:px-8">
        <h2
          id="rail-title"
          className="text-[clamp(32px,4.4vw,64px)] font-extrabold leading-[0.95] tracking-[-0.035em] [font-variation-settings:'wdth'_84]"
        >
          {title}
        </h2>
        <div className="flex flex-none items-center gap-2">
          {moreHref ? (
            <Link
              href={moreHref}
              className="flex min-h-11 items-center whitespace-nowrap rounded-full bg-field px-4 text-[13px] font-semibold hover:bg-field-hover"
            >
              Xem tất cả →
            </Link>
          ) : null}
          <button
            type="button"
            aria-label="Sản phẩm trước"
            onClick={() => step(-1)}
            disabled={edge.start}
            className="hidden h-[42px] w-[42px] place-items-center rounded-full bg-field transition-colors hover:bg-field-hover sm:grid"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Sản phẩm sau"
            onClick={() => step(1)}
            disabled={edge.end}
            className="hidden h-[42px] w-[42px] place-items-center rounded-full bg-field transition-colors hover:bg-field-hover sm:grid"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        onScroll={updateEdge}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        // Link và ảnh trong thẻ mặc định kéo-thả được; để vậy thì trình duyệt
        // giành mất thao tác kéo và dải không cuộn theo chuột.
        onDragStart={(e) => e.preventDefault()}
        className={cn(
          "flex gap-[18px] overflow-x-auto pb-8 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          // Lề trái/phải bám theo `Container` (1360px) của trang, để thẻ đầu thẳng
          // hàng với tiêu đề mà dải vẫn tràn hết bề ngang màn hình.
          "px-[max(16px,calc((100vw-1360px)/2+16px))] scroll-px-[max(16px,calc((100vw-1360px)/2+16px))]",
          "lg:px-[max(32px,calc((100vw-1360px)/2+32px))] lg:scroll-px-[max(32px,calc((100vw-1360px)/2+32px))]",
          // Có chuột thì không cho bôi đen chữ — kéo dải sẽ tô xanh cả trang.
          "[@media(pointer:fine)]:select-none",
          dragging ? "cursor-grabbing" : "snap-x snap-mandatory [@media(pointer:fine)]:cursor-grab",
        )}
      >
        {products.map((p) => (
          <div
            key={p.id}
            data-rail-item
            className={cn("w-[clamp(220px,24vw,330px)] flex-none snap-start", dragging && "pointer-events-none")}
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
