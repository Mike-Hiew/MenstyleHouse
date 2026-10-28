"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Photo } from "@/components/ui/photo";
import { FIT_LAB } from "@/content/fit-lab";

/**
 * Fit Lab (mục 5, mockup v2): khối tối, ghim lại khi cuộn và đi qua bốn bước
 * — vải 250gsm, so sánh trước/sau 30 lần giặt, đường may đôi, dải cân nặng
 * S–XXL. Số liệu ở `src/content/fit-lab.ts`.
 *
 * Khách bật giảm chuyển động thì không ghim và không đổi bước theo cuộn: bốn
 * bước xếp dọc, hiện đủ ngay.
 */

const STEPS = [FIT_LAB.fabric, FIT_LAB.wash, FIT_LAB.stitch, FIT_LAB.range];

export function FitLab() {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduce ? <FitLabStatic /> : <FitLabPinned />;
}

function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      aria-labelledby="fit-lab-title"
      className={cn("relative my-24 rounded-[40px] bg-[#121110] text-[#f3f1ed]", className)}
    >
      {children}
    </section>
  );
}

function Heading() {
  return (
    <>
      <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#f3f1ed]/60">
        <i className="block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
        {FIT_LAB.eyebrow}
      </span>
      <h2
        id="fit-lab-title"
        className="mb-4 mt-2 text-[clamp(34px,4.4vw,64px)] font-extrabold leading-[0.95] tracking-[-0.035em] [font-variation-settings:'wdth'_84] lg:mb-9 lg:mt-3.5"
      >
        {FIT_LAB.title}
      </h2>
    </>
  );
}

function FitLabPinned() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      setProgress(span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const active = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length));

  return (
    <Shell>
      {/* Chiều cao 440vh tạo quãng cuộn; phần trong ghim ở giữa màn hình. */}
      <div ref={ref} className="h-[440vh]">
        <div className="sticky top-0 flex h-svh items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-[1360px] items-center gap-5 px-4 lg:grid-cols-[5fr_7fr] lg:gap-14 lg:px-8">
            <div>
              <Heading />
              <ol
                className="relative flex flex-col gap-1.5 pl-[22px] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded before:bg-[#f3f1ed]/12"
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-2 w-0.5 rounded bg-accent transition-[height] duration-200"
                  style={{ height: `calc((100% - 16px) * ${progress})` }}
                />
                {STEPS.map((s, i) => (
                  <li
                    key={s.label}
                    aria-current={i === active ? "step" : undefined}
                    className={cn(
                      "py-1.5 transition-opacity duration-500 lg:py-3",
                      i === active ? "opacity-100" : "opacity-30 max-lg:hidden",
                    )}
                  >
                    <span className="text-[15px] text-[#f3f1ed]/70">{s.label}</span>
                    <span
                      className={cn(
                        "block font-bold tracking-[-0.02em] [font-variation-settings:'wdth'_80] transition-[font-size] duration-500",
                        i === active ? "text-[clamp(40px,4.6vw,64px)] leading-[1.05]" : "text-[22px]",
                      )}
                    >
                      {s.value}
                    </span>
                    <span
                      className={cn(
                        "block overflow-hidden text-[14px] text-[#f3f1ed]/60 transition-[max-height] duration-700",
                        i === active ? "max-h-20" : "max-h-0",
                      )}
                    >
                      {s.detail}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-7 text-[12px] text-[#f3f1ed]/40">{FIT_LAB.note}</p>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[46vh] lg:ml-auto lg:mr-0 lg:max-h-[78vh] lg:max-w-none">
              {[FabricVisual, WashVisual, StitchVisual, RangeVisual].map((V, i) => (
                <div
                  key={i}
                  aria-hidden={i !== active}
                  className={cn(
                    "absolute inset-0 overflow-hidden rounded-[32px] bg-[#1c1a19] transition-[opacity,transform,filter] duration-700 ease-[var(--ease-out-soft)]",
                    i === active
                      ? "scale-100 opacity-100 blur-0"
                      : "pointer-events-none scale-[0.94] opacity-0 blur-[10px]",
                  )}
                >
                  <V on={i === active} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function FitLabStatic() {
  return (
    <Shell className="py-16">
      <div className="mx-auto max-w-[1360px] px-4 lg:px-8">
        <Heading />
        <ol className="grid gap-6 md:grid-cols-2">
          {STEPS.map((s, i) => {
            const V = [FabricVisual, WashVisual, StitchVisual, RangeVisual][i];
            return (
              <li key={s.label}>
                <div className="relative mb-4 aspect-square overflow-hidden rounded-[32px] bg-[#1c1a19]">
                  <V on />
                </div>
                <span className="text-[15px] text-[#f3f1ed]/70">{s.label}</span>
                <span className="block text-[32px] font-bold tracking-[-0.02em]">{s.value}</span>
                <span className="block text-[14px] text-[#f3f1ed]/60">{s.detail}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-7 text-[12px] text-[#f3f1ed]/40">{FIT_LAB.note}</p>
      </div>
    </Shell>
  );
}

/* ── Hình minh hoạ từng bước ─────────────────────────────── */

function Tag({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <span
      className={cn(
        "absolute top-4 z-[2] rounded-full bg-neutral-900/45 px-3.5 py-2 text-[12.5px] font-semibold text-bg backdrop-blur-md max-sm:px-2.5 max-sm:py-1.5 max-sm:text-[11px]",
        right ? "right-4" : "left-4",
      )}
    >
      {children}
    </span>
  );
}

/** Mặt vải phóng to: các vòng sợi dệt kim xếp lớp. */
function FabricVisual({ on }: { on: boolean }) {
  return (
    <>
      <Tag>{FIT_LAB.fabric.value} · phóng 12×</Tag>
      <svg
        viewBox="0 0 400 400"
        className={cn(
          "h-full w-full transition-transform duration-[1600ms] ease-[var(--ease-out-soft)]",
          on ? "scale-100" : "scale-125",
        )}
      >
        <defs>
          <pattern id="knit" width="40" height="34" patternUnits="userSpaceOnUse">
            <path d="M0 34 Q10 4 20 34 Q30 4 40 34" fill="none" stroke="#d8d2c8" strokeWidth="7" strokeLinecap="round" />
            <path d="M0 17 Q10 -13 20 17 Q30 -13 40 17" fill="none" stroke="#b3aca4" strokeWidth="7" strokeLinecap="round" opacity=".7" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="#2a2725" />
        <rect width="400" height="400" fill="url(#knit)" />
      </svg>
    </>
  );
}

/** Thanh so sánh trước/sau 30 lần giặt: kéo tay nắm (chuột, ngón tay hoặc phím mũi tên). */
function WashVisual({ on }: { on: boolean }) {
  const [x, setX] = React.useState(50);
  const box = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);

  const fromPointer = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setX(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  const side = (img: { url: string; alt: string } | null, tone: string) =>
    img ? (
      <Photo src={img.url} alt={img.alt} sizes="(min-width: 1024px) 40vw, 90vw" />
    ) : (
      // TODO: ảnh thật. Khung màu giữ chỗ.
      <div className="absolute inset-0" style={{ background: tone }} />
    );

  const W = FIT_LAB.wash;
  return (
    <div
      ref={box}
      className="absolute inset-0 touch-pan-y select-none"
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        fromPointer(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && fromPointer(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <div className="absolute inset-0">{side(W.before, "linear-gradient(#b3aca4,#857e76 62%,#3f3b37)")}</div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${x}%)` }}>
        {side(W.after, "linear-gradient(#aca59d,#7d766f 62%,#3a3632)")}
      </div>
      <Tag>Trước</Tag>
      <Tag right>Sau 30 lần giặt</Tag>

      <div className="absolute bottom-4 left-4 z-[2] rounded-2xl bg-neutral-900/45 px-3.5 py-3 text-[12.5px] leading-[1.6] text-bg backdrop-blur-md max-sm:text-[11px]">
        {W.measures.map((m) => (
          <div key={m.label}>
            {m.label} <b>{m.before.toFixed(1).replace(".", ",")}cm</b>
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 right-4 z-[2] rounded-2xl bg-neutral-900/45 px-3.5 py-3 text-right text-[12.5px] leading-[1.6] text-bg backdrop-blur-md max-sm:text-[11px]">
        {W.measures.map((m) => (
          <div key={m.label}>
            {m.label} <b>{m.after.toFixed(1).replace(".", ",")}cm</b>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 top-0 z-[3] -ml-px w-0.5 bg-white/90" style={{ left: x + "%" }}>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(x)}
          tabIndex={on ? 0 : -1}
          aria-label="So sánh trước và sau 30 lần giặt"
          onChange={(e) => setX(Number(e.target.value))}
          className="peer sr-only"
        />
        <span className="absolute left-1/2 top-1/2 -ml-[26px] -mt-[26px] grid h-[52px] w-[52px] place-items-center rounded-full bg-white text-[18px] text-neutral-900 shadow-[0_8px_24px_rgba(0,0,0,.35)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
          ↔
        </span>
      </div>
    </div>
  );
}

/** Đường may đôi ở vai và sườn, vẽ dần khi tới bước này. */
function StitchVisual({ on }: { on: boolean }) {
  return (
    <>
      <Tag>{FIT_LAB.stitch.value} ở vai và sườn</Tag>
      <svg viewBox="0 0 400 400" className="h-full w-full">
        <rect width="400" height="400" fill="#1c1a19" />
        <path
          d="M120 80 L170 60 Q200 80 230 60 L280 80 L340 150 L300 175 L295 330 L105 330 L100 175 L60 150 Z"
          fill="#3b3835"
        />
        {[
          "M120 92 L170 72",
          "M126 102 L172 84",
          "M280 92 L230 72",
          "M274 102 L228 84",
          "M112 180 L110 320",
          "M122 180 L120 320",
          "M288 180 L290 320",
          "M278 180 L280 320",
        ].map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="#e8341a"
            strokeWidth="3"
            strokeDasharray="6 6"
            pathLength={420}
            className="transition-[stroke-dashoffset] duration-[1600ms] ease-[var(--ease-out-soft)]"
            style={{ strokeDashoffset: on ? 0 : 420 }}
          />
        ))}
      </svg>
    </>
  );
}

/** Năm size và dải cân nặng mỗi size. */
function RangeVisual({ on }: { on: boolean }) {
  const sizes = FIT_LAB.range.sizes;
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-7 p-[22px] lg:p-12">
      <div className="grid grid-cols-5 gap-1.5">
        {sizes.map((s, i) => (
          <div
            key={s.size}
            className={cn(
              "flex h-20 origin-bottom flex-col justify-end rounded-2xl p-2 text-[16px] font-bold transition-[transform,opacity] duration-700 ease-[var(--ease-out-soft)] lg:h-[120px] lg:p-3 lg:text-[22px]",
              i === Math.floor(sizes.length / 2) ? "bg-accent" : "bg-[#f3f1ed]/8",
              on ? "scale-y-100 opacity-100" : "scale-y-[0.2] opacity-0",
            )}
            style={{ transitionDelay: on ? i * 90 + "ms" : "0ms" }}
          >
            {s.size}
            <small className="text-[11.5px] font-normal text-[#f3f1ed]/60">{s.kg}kg</small>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] tabular-nums text-[#f3f1ed]/50">
        <span>{sizes[0].kg.split("–")[0]}kg</span>
        <span>{sizes[sizes.length - 1].kg.split("–")[1]}kg</span>
      </div>
    </div>
  );
}
