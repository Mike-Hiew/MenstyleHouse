"use client";

import * as React from "react";
import { formatVnd } from "@/lib/money";

/**
 * Số chạy từ 0 lên giá trị thật trong ~1,1s (thẻ số liệu ở trang Tổng quan,
 * kiểu Glass). Server vẫn render sẵn số thật, nên không có JS hay đang giảm
 * chuyển động thì khách thấy ngay số đúng, không thấy số 0.
 */
export function CountUp({ value, money }: { value: number; money?: boolean }) {
  const fmt = React.useCallback(
    (v: number) => (money ? formatVnd(Math.round(v)) : Math.round(v).toLocaleString("vi-VN")),
    [money],
  );
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || value === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Ghi thẳng vào DOM thay vì setState mỗi khung hình: 60 lần render/giây
    // cho bốn thẻ là phí, và số cuối cùng vẫn khớp đúng bản server.
    const t0 = performance.now() + 300;
    let raf = 0;
    el.textContent = fmt(0);
    const tick = (t: number) => {
      const p = Math.max(0, Math.min(1, (t - t0) / 1100));
      el.textContent = fmt(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = fmt(value);
    };
  }, [value, fmt]);

  return <span ref={ref}>{fmt(value)}</span>;
}
