/**
 * Gợi ý size theo chiều cao, cân nặng và kiểu mặc (mục 3, mockup v2).
 *
 * Hàm thuần, không đọc DB: dữ liệu vào là các khoảng chiều cao / cân nặng của
 * từng size, xếp từ nhỏ đến lớn. Khoảng lấy từ cột "Gợi ý" của bảng size
 * trong DB (cửa hàng sửa ở `/admin/bang-size`) qua `fitRangesFromChart`; bảng
 * nào chưa ghi thì dùng bảng mặc định ở `src/content/size-finder.ts`.
 */

export type FitPref = "om" | "vua" | "rong";

export type SizeRange = {
  size: string;
  /** cm, cả hai đầu. Thiếu thì chỉ xét cân nặng (ví dụ bảng quần chỉ ghi kg). */
  height: [number, number] | null;
  /** kg, cả hai đầu. */
  weight: [number, number] | null;
};

export type SizeInput = { heightCm: number; weightKg: number; fit: FitPref };

export type SizeResult = {
  size: string;
  /** Vị trí trong `ranges`, để tô thang S–XXL. */
  index: number;
  /** 0–1. Dưới `BETWEEN_SIZES` là đang lưng chừng giữa hai size. */
  confidence: number;
};

/** Dưới ngưỡng này giao diện báo "bạn đang ở giữa 2 size". */
export const BETWEEN_SIZES = 0.78;

/**
 * Kiểu mặc dịch vị trí đi bao nhiêu size. Ôm lùi gần nửa size, rộng tiến hơn
 * nửa size — khách chọn "rộng" là muốn lên size thật, còn chọn "ôm" thì ít ai
 * muốn xuống hẳn một size chỉ vì nửa phân.
 */
const FIT_SHIFT: Record<FitPref, number> = { om: -0.45, vua: 0, rong: 0.55 };

/** Cân nặng quyết định nhiều hơn chiều cao với áo/quần dệt kim — 60/40. */
const WEIGHT_SHARE = 0.6;

/**
 * Đổi một số đo thành vị trí liên tục trên thang size: đúng giữa khoảng của
 * size thứ i là i, nằm giữa hai size thì nội suy, vượt ra ngoài thì ngoại suy
 * theo bề rộng khoảng ở đầu đó.
 */
function position(value: number, spans: ([number, number] | null)[]): number | null {
  const pts = spans
    .map((s, i) => (s ? { i, mid: (s[0] + s[1]) / 2, half: Math.max(1, (s[1] - s[0]) / 2) } : null))
    .filter((p): p is { i: number; mid: number; half: number } => p !== null);
  if (pts.length === 0) return null;
  if (pts.length === 1) return pts[0].i + (value - pts[0].mid) / (pts[0].half * 2);

  const first = pts[0];
  const last = pts[pts.length - 1];
  if (value <= first.mid) return first.i + (value - first.mid) / (first.half * 2);
  if (value >= last.mid) return last.i + (value - last.mid) / (last.half * 2);

  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k];
    const b = pts[k + 1];
    if (value <= b.mid) return a.i + ((value - a.mid) / (b.mid - a.mid)) * (b.i - a.i);
  }
  return last.i;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function recommendSize(input: SizeInput, ranges: SizeRange[]): SizeResult | null {
  if (ranges.length === 0) return null;

  const pw = position(input.weightKg, ranges.map((r) => r.weight));
  const ph = position(input.heightCm, ranges.map((r) => r.height));
  if (pw === null && ph === null) return null;

  const base =
    pw !== null && ph !== null ? pw * WEIGHT_SHARE + ph * (1 - WEIGHT_SHARE) : (pw ?? ph)!;
  const p = base + FIT_SHIFT[input.fit];
  const index = clamp(Math.round(p), 0, ranges.length - 1);

  // Càng gần giữa một size càng chắc; ngay ranh giới hai size thì ~55%.
  let confidence = 1 - Math.min(0.5, Math.abs(p - index)) * 0.9;
  // Nằm ngoài cả thang (quá nhỏ / quá lớn so với bảng) thì không nên tự tin.
  const outside = Math.max(0, -0.5 - p, p - (ranges.length - 0.5));
  confidence -= outside * 0.35;
  // Chiều cao và cân nặng chỉ về hai size xa nhau (cao gầy, thấp đậm) — vẫn
  // gợi ý theo trung bình nhưng hạ độ tin cậy.
  if (pw !== null && ph !== null) confidence -= Math.max(0, Math.abs(pw - ph) - 1) * 0.12;

  return {
    size: ranges[index].size,
    index,
    confidence: Math.round(clamp(confidence, 0.15, 0.98) * 100) / 100,
  };
}

/* ── Đọc khoảng từ chữ ───────────────────────────────────────── */

const DASH = "\\s*[-–—~]\\s*";

/** "1m60" → 160, "1m6" → 160, "160" → 160, "1.72m" → 172. */
function cm(token: string): number | null {
  const t = token.trim().toLowerCase().replace(",", ".");
  let m = /^(\d)m(\d{1,2})$/.exec(t);
  if (m) return Number(m[1]) * 100 + Number(m[2].padEnd(2, "0"));
  m = /^(\d(?:\.\d{1,2}))m?$/.exec(t);
  if (m) return Math.round(Number(m[1]) * 100);
  m = /^(\d{3})(?:cm)?$/.exec(t);
  if (m) return Number(m[1]);
  return null;
}

/**
 * Đọc khoảng chiều cao và cân nặng trong một ô chữ, ví dụ
 * `"1m60–1m66 · 52–58kg"`, `"160-166cm, 52-58 kg"`, `"55–62kg"`.
 * Phần nào không có hoặc không đọc được thì `null`.
 */
export function parseFitHint(text: string): { height: [number, number] | null; weight: [number, number] | null } {
  const s = text.toLowerCase();

  let weight: [number, number] | null = null;
  const w = new RegExp(`(\\d{2,3})${DASH}(\\d{2,3})\\s*kg`).exec(s);
  if (w) weight = [Number(w[1]), Number(w[2])];

  let height: [number, number] | null = null;
  const h = new RegExp(`(\\dm\\d{1,2}|\\d[.,]\\d{1,2}m?|\\d{3}(?:cm)?)${DASH}(\\dm\\d{1,2}|\\d[.,]\\d{1,2}m?|\\d{3})(?:\\s*cm)?`).exec(
    // Bỏ phần cân nặng ra trước để "52–58kg" không bị đọc nhầm thành chiều cao.
    w ? s.replace(w[0], " ") : s,
  );
  if (h) {
    const a = cm(h[1]);
    const b = cm(h[2]);
    if (a !== null && b !== null && a >= 120 && b <= 230) height = [a, b];
  }

  const ok = (r: [number, number] | null) => (r && r[0] <= r[1] ? r : null);
  return { height: ok(height), weight: ok(weight) };
}

/** Tên cột chứa gợi ý chiều cao/cân nặng trong bảng size. */
export const FIT_HINT_COLUMN = /gợi ý/i;

/**
 * Lấy khoảng của từng size từ một bảng size (dạng hiển thị: cột đầu là "Size").
 * Trả `[]` khi bảng không có cột gợi ý hoặc không dòng nào đọc được — nơi gọi
 * khi đó không hiện bộ gợi ý cho bảng này.
 */
export function fitRangesFromChart(chart: {
  columns: string[];
  rows: { size: string; values: string[] }[];
}): SizeRange[] {
  // `columns[0]` là "Size", không nằm trong `values`.
  const col = chart.columns.slice(1).findIndex((c) => FIT_HINT_COLUMN.test(c));
  if (col < 0) return [];
  const ranges = chart.rows
    .map((r) => ({ size: r.size, ...parseFitHint(r.values[col] ?? "") }))
    .filter((r) => r.height || r.weight);
  return ranges.length >= 2 ? ranges : [];
}
