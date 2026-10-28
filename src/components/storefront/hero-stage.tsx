"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/photo";
import { formatVnd } from "@/lib/money";

/**
 * Hero v2 (mục 6, mockup v2) — bọc hero hiện có, **không đổi nội dung**.
 *
 * Từ tablet trở lên (md:) khối này ghim lại khi cuộn:
 * - ảnh bắt đầu là một thẻ bo góc bên phải rồi nở ra tràn màn hình
 *   (`clip-path: inset(...)` chạy về 0);
 * - chữ đỏ "đứng form" giãn trục `wdth` của Archivo từ 62 lên 125;
 * - gần cuối, phần chữ bên trái mờ đi, thay bằng dòng tiêu đề trắng và một
 *   thẻ kính giới thiệu sản phẩm trong ảnh.
 *
 * Điện thoại và khách bật giảm chuyển động thấy đúng hero cũ: không ghim,
 * không chạy hiệu ứng (`motion-safe:` + kiểm tra trong JS).
 *
 * Tiến độ cuộn ghi thẳng vào biến CSS trên thẻ `<section>` — không setState,
 * nên cuộn không làm React render lại. Lần vẽ đầu dùng giá trị mặc định
 * (trạng thái đầu), nên chữ và ảnh hero hiện ngay từ HTML server: không ảnh
 * hưởng LCP.
 */

type Props = {
  /** Phần chữ của hero hiện có (server render), giữ nguyên. */
  children: React.ReactNode;
  image: { url: string; alt: string } | null;
  /** Nhãn góc ảnh ("Giảm đến 40% — tuần này"). */
  tag: string;
  /** Sản phẩm trong ảnh — thẻ kính hiện ở cuối. */
  product: { name: string; slug: string; price: number } | null;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Trạng thái đầu của thẻ ảnh (cũng là giá trị mặc định trong CSS). */
const START = { t: 13, r: 3, b: 6, l: 52, rr: 32 };

export function HeroStage({ children, image, tag, product }: Props) {
  const ref = React.useRef<HTMLElement>(null);
  const copyRef = React.useRef<HTMLDivElement>(null);
  const overRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
    let raf = 0;

    const apply = () => {
      raf = 0;
      if (!mq.matches) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? clamp01(-r.top / span) : 0;

      const k = ease(clamp01(p / 0.7));
      const s = el.style;
      s.setProperty("--hero-t", START.t * (1 - k) + "%");
      s.setProperty("--hero-r", START.r * (1 - k) + "%");
      s.setProperty("--hero-b", START.b * (1 - k) + "%");
      s.setProperty("--hero-l", START.l * (1 - k) + "%");
      s.setProperty("--hero-rr", START.rr * (1 - k) + "px");
      s.setProperty("--hero-w", String(Math.round(62 + 63 * ease(clamp01(p / 0.5)))));
      // Chữ mờ hẳn trước khi ảnh nở tới nửa trái, để không có lúc chữ đè lên ảnh.
      const fade = 1 - clamp01((p - 0.06) / 0.2);
      const over = clamp01((p - 0.72) / 0.2);
      s.setProperty("--hero-fade", String(fade));
      s.setProperty("--hero-over", String(over));

      // Phần đã mờ hẳn thì không được bấm/tab vào nữa (và ngược lại).
      copyRef.current?.toggleAttribute("inert", fade < 0.3);
      overRef.current?.toggleAttribute("inert", over < 0.5);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const reset = () => {
      // Về điện thoại / bật giảm chuyển động: bỏ hết biến, về hero tĩnh.
      if (!mq.matches) {
        for (const v of ["t", "r", "b", "l", "rr", "w", "fade", "over"]) el.style.removeProperty("--hero-" + v);
        copyRef.current?.removeAttribute("inert");
        overRef.current?.setAttribute("inert", "");
      }
      onScroll();
    };

    reset();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    mq.addEventListener("change", reset);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mq.removeEventListener("change", reset);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={ref} className="hero-stage relative md:motion-safe:h-[230vh]">
      <div className="md:relative md:h-svh md:min-h-[560px] md:overflow-hidden md:motion-safe:sticky md:motion-safe:top-0">
        {/* Phần chữ: trên điện thoại nằm trong luồng như cũ; từ md: đè lên nửa trái. */}
        <div
          ref={copyRef}
          className="relative z-[2] md:absolute md:inset-y-0 md:left-0 md:flex md:w-[52%] md:items-center md:justify-end md:pt-[8vh] md:opacity-[var(--hero-fade)] md:[transform:translateY(calc((1-var(--hero-fade))*-40px))]"
        >
          {children}
        </div>

        {/* Ảnh: thẻ bo góc trên điện thoại; từ md: phủ cả khung, cắt bằng clip-path. */}
        <div className="relative mx-4 min-h-[320px] overflow-hidden rounded-panel bg-subtle md:absolute md:inset-0 md:m-0 md:min-h-0 md:rounded-none md:[clip-path:inset(var(--hero-t)_var(--hero-r)_var(--hero-b)_var(--hero-l)_round_var(--hero-rr))]">
          {image ? (
            <Photo src={image.url} alt={image.alt} sizes="(min-width: 768px) 100vw, 100vw" priority />
          ) : null}
          {/* Nhãn sale bám góc dưới-trái của thẻ ảnh ở mọi trạng thái. */}
          <span className="absolute bottom-4 left-4 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-bg shadow-raised md:bottom-[calc(var(--hero-b)+16px)] md:left-[calc(var(--hero-l)+16px)] md:opacity-[var(--hero-fade)]">
            {tag}
          </span>
        </div>

        {/* Cuối hành trình: tiêu đề trắng + thẻ kính sản phẩm. Chỉ từ md:. */}
        <div
          ref={overRef}
          inert
          className="pointer-events-none absolute inset-x-0 bottom-[max(48px,env(safe-area-inset-bottom))] z-[3] hidden opacity-[var(--hero-over)] [transform:translateY(calc((1-var(--hero-over))*30px))] md:block"
        >
          <div className="mx-auto flex max-w-[1360px] flex-wrap items-end justify-between gap-6 px-4 text-bg lg:px-8">
            <p className="max-w-[12ch] text-[clamp(36px,5.6vw,84px)] font-extrabold leading-[0.92] tracking-[-0.035em] [font-variation-settings:'wdth'_80] [text-shadow:0_2px_24px_rgba(0,0,0,.25)]">
              Mặc cả ngày. Giặt cả năm. Vẫn đứng form.
            </p>
            {product ? (
              <Link
                href={{ pathname: "/san-pham/" + product.slug }}
                className="pointer-events-auto flex min-w-0 items-center gap-3.5 rounded-[20px] bg-surface/62 py-3 pl-[18px] pr-3 text-text shadow-raised backdrop-blur-xl transition-colors hover:bg-surface/80"
              >
                <span className="min-w-0">
                  <b className="block truncate text-[15px]">{product.name}</b>
                  <span className="text-[13px] text-muted">{formatVnd(product.price)}</span>
                </span>
                <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-neutral-900 text-bg">
                  <ArrowRight size={16} aria-hidden />
                </span>
                <span className="sr-only">Xem sản phẩm</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
