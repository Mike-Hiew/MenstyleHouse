"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import {
  BETWEEN_SIZES,
  recommendSize,
  type FitPref,
  type SizeRange,
  type SizeResult,
} from "@/lib/size-finder";
import { SLIDER } from "@/content/size-finder";

/**
 * Bộ gợi ý size: hai thanh trượt chiều cao / cân nặng, chọn kiểu mặc, và thẻ
 * kết quả (chữ size lớn, thang size, độ tin cậy, ghi chú). Dùng ở trang chủ
 * và trong sheet "Tìm size cho tôi" của trang sản phẩm.
 *
 * Lần nhập gần nhất lưu ở localStorage — mở trang sản phẩm sau khi đã thử ở
 * trang chủ là có sẵn gợi ý, không bắt kéo lại.
 */

const STORAGE_KEY = "msh:size-finder";

export type FinderInput = { h: number; w: number; fit: FitPref };

const FITS: { value: FitPref; label: string; word: string }[] = [
  { value: "om", label: "Ôm", word: "ôm" },
  { value: "vua", label: "Vừa", word: "vừa" },
  { value: "rong", label: "Rộng", word: "rộng" },
];

const START: FinderInput = { h: SLIDER.height.start, w: SLIDER.weight.start, fit: "vua" };

/** Đọc lần nhập đã lưu; hỏng hoặc bị chặn localStorage thì `null`. */
export function readSavedInput(): FinderInput | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<FinderInput>;
    if (
      typeof v.h === "number" &&
      typeof v.w === "number" &&
      (v.fit === "om" || v.fit === "vua" || v.fit === "rong")
    ) {
      return { h: v.h, w: v.w, fit: v.fit };
    }
  } catch {
    // Trình duyệt chặn bộ nhớ (ẩn danh, tắt cookie) — coi như chưa có.
  }
  return null;
}

function save(v: FinderInput) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // Không lưu được thì thôi, gợi ý vẫn chạy.
  }
}

export function recommendFor(v: FinderInput, ranges: SizeRange[]): SizeResult | null {
  return recommendSize({ heightCm: v.h, weightKg: v.w, fit: v.fit }, ranges);
}

export function SizeFinder({
  ranges,
  label = "Size gợi ý cho áo",
  layout = "split",
  onResult,
  footer,
}: {
  ranges: SizeRange[];
  label?: string;
  /** `split`: hai cột như mockup trang chủ; `stack`: dọc, cho sheet. */
  layout?: "split" | "stack";
  onResult?: (r: SizeResult | null) => void;
  /** Nút hành động dưới thẻ kết quả (ở trang sản phẩm: "Chọn size …"). */
  footer?: (r: SizeResult) => React.ReactNode;
}) {
  const [v, setV] = React.useState<FinderInput>(START);
  const id = React.useId();

  // Đọc sau khi gắn để HTML server và lần render đầu ở client giống nhau.
  React.useEffect(() => {
    const saved = readSavedInput();
    if (saved) setV(saved);
  }, []);

  const result = React.useMemo(() => recommendFor(v, ranges), [v, ranges]);

  const onResultRef = React.useRef(onResult);
  onResultRef.current = onResult;
  React.useEffect(() => {
    onResultRef.current?.(result);
  }, [result]);

  const update = (patch: Partial<FinderInput>) => {
    setV((cur) => {
      const next = { ...cur, ...patch };
      save(next);
      return next;
    });
  };

  const fitIndex = FITS.findIndex((f) => f.value === v.fit);
  const sure = result ? result.confidence >= BETWEEN_SIZES : false;
  const pct = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div className={cn("grid gap-5", layout === "split" && "lg:grid-cols-2")}>
      <div
        className={
          layout === "split"
            ? "flex flex-col gap-8 rounded-panel bg-surface p-6 shadow-soft lg:p-9"
            : "flex flex-col gap-7"
        }
      >
        <Slider
          id={id + "h"}
          label="Chiều cao"
          unit="cm"
          value={v.h}
          min={SLIDER.height.min}
          max={SLIDER.height.max}
          onChange={(h) => update({ h })}
        />
        <Slider
          id={id + "w"}
          label="Cân nặng"
          unit="kg"
          value={v.w}
          min={SLIDER.weight.min}
          max={SLIDER.weight.max}
          onChange={(w) => update({ w })}
        />

        <div>
          <p className="mb-3 font-semibold" id={id + "fit"}>
            Bạn thích mặc
          </p>
          <div
            role="radiogroup"
            aria-labelledby={id + "fit"}
            className="relative inline-grid grid-cols-3 rounded-full bg-field p-1"
          >
            <span
              aria-hidden
              className="absolute bottom-1 left-1 top-1 w-[calc((100%-8px)/3)] rounded-full bg-neutral-900 transition-transform duration-[450ms] ease-[var(--ease-out-soft)]"
              style={{ transform: `translateX(${fitIndex * 100}%)` }}
            />
            {FITS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={v.fit === f.value}
                onClick={() => update({ fit: f.value })}
                className={cn(
                  "relative z-[1] min-h-11 rounded-full px-5 text-[14px] font-semibold transition-colors duration-300",
                  v.fit === f.value ? "text-bg" : "text-muted hover:text-text",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "relative flex flex-col gap-[18px] overflow-hidden rounded-panel bg-sand p-6",
          layout === "split" ? "lg:p-9" : "lg:p-7",
        )}
        aria-live="polite"
      >
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-muted">
          <i className="block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          {label}
        </span>

        {result ? (
          <>
            <p
              key={result.size}
              className={cn(
                "font-black leading-[0.78] tracking-[-0.05em] [font-variation-settings:'wdth'_62]",
                "motion-safe:animate-[size-swap_.45s_var(--ease-out-soft)]",
                layout === "split" ? "text-[clamp(120px,19vw,260px)]" : "text-[120px]",
              )}
            >
              <span className="sr-only">Size gợi ý: </span>
              {result.size}
            </p>

            <div
              className="grid gap-1.5 rounded-full bg-surface/50 p-[5px]"
              style={{ gridTemplateColumns: `repeat(${ranges.length}, minmax(0, 1fr))` }}
              aria-hidden
            >
              {ranges.map((r, i) => (
                <span
                  key={r.size}
                  className={cn(
                    "rounded-full py-2 text-center text-[13px] font-semibold transition-colors duration-[400ms]",
                    i === result.index ? "bg-neutral-900 text-bg" : "text-muted",
                  )}
                >
                  {r.size}
                </span>
              ))}
            </div>

            <div>
              <div className="mb-2 flex justify-between text-[13.5px]">
                <span>Độ tin cậy</span>
                <b className="tabular-nums">{pct}%</b>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-field"
                role="meter"
                aria-label="Độ tin cậy của gợi ý"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
              >
                <i
                  className="block h-full rounded-full bg-neutral-900 transition-[width] duration-[600ms] ease-[var(--ease-out-soft)]"
                  style={{ width: pct + "%" }}
                />
              </div>
            </div>

            <p className="text-[14px] text-muted">
              {sure
                ? `${v.h}cm · ${v.w}kg, mặc ${FITS[fitIndex].word}: size ${result.size} theo bảng size MSH. Không vừa thì đổi miễn phí trong 15 ngày.`
                : "Bạn đang ở giữa 2 size. Thích mặc thoải mái thì lấy size lớn hơn. Đổi size miễn phí 15 ngày."}
            </p>

            {footer ? footer(result) : null}
          </>
        ) : (
          <p className="text-[14px] text-muted">Chưa có bảng size để gợi ý cho sản phẩm này.</p>
        )}
      </div>
    </div>
  );
}

function Slider({
  id,
  label,
  unit,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-3.5 flex items-baseline justify-between">
        <span className="font-semibold">{label}</span>
        <b className="text-[46px] font-extrabold leading-none tracking-[-0.02em] tabular-nums [font-variation-settings:'wdth'_72] max-sm:text-[36px]">
          {value}
          <small className="ml-1 text-[15px] font-medium tracking-normal text-muted">{unit}</small>
        </b>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-valuetext={value + " " + unit}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-ink"
        style={{ ["--p" as string]: ((value - min) / (max - min)) * 100 + "%" }}
      />
      <div className="mt-1 flex justify-between text-[12px] text-muted">
        <span>{min}</span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
}
