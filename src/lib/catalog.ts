import { z } from "zod";

/**
 * Phần thuần của tầng catalog: đọc/ghi tham số URL, hằng số hiển thị, tính giá.
 * Không chạm Prisma nên client component import được. Truy vấn nằm ở
 * `src/server/catalog.ts`.
 *
 * Mô hình lọc bám sheet lọc của `docs/mockup/Men Style House Mobile.dc.html`:
 * danh mục và màu là checkbox **có số đếm**, size là chip, giá là hai ô từ–đến.
 * Cùng một mô hình cho mọi bề rộng — `docs/RESPONSIVE.md` cấm tách hai nhánh.
 */

/** Mỗi lần bấm "Tải thêm" mở thêm bấy nhiêu sản phẩm. */
export const PAGE_STEP = 12;

export const SORTS = {
  "moi-nhat": "Mới nhất",
  "gia-tang": "Giá thấp → cao",
  "gia-giam": "Giá cao → thấp",
  "ban-chay": "Bán chạy",
} as const;

export type SortKey = keyof typeof SORTS;

/** Thứ tự size khi hiển thị — chữ trước, số sau, Freesize cuối. */
const SIZE_ORDER = ["S", "M", "L", "XL", "XXL", "29", "30", "31", "32", "34", "36", "Freesize"];

export function compareSizes(a: string, b: string): number {
  const ra = SIZE_ORDER.indexOf(a);
  const rb = SIZE_ORDER.indexOf(b);
  return (ra === -1 ? SIZE_ORDER.length : ra) - (rb === -1 ? SIZE_ORDER.length : rb);
}

/* ── Phân tích tham số URL ────────────────────────────────── */

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Nhận cả `?size=L&size=XL` lẫn `?size=L,XL`, bỏ trùng. */
const multi = z
  .preprocess((v) => {
    const raw = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
    const parts = raw.flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean);
    return [...new Set(parts)].slice(0, 20);
  }, z.array(z.string().max(60)))
  .catch([]);

const flag = z
  .preprocess((v) => (Array.isArray(v) ? v[0] : v) === "1", z.boolean())
  .catch(false);

const text = z
  .preprocess((v) => {
    const s = Array.isArray(v) ? v[0] : v;
    return typeof s === "string" ? s.trim().slice(0, 80) : "";
  }, z.string())
  .catch("");

const money = z
  .preprocess((v) => {
    const n = Number(Array.isArray(v) ? v[0] : v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }, z.number().int().min(0).max(100_000_000))
  .catch(0);

const shown = z
  .preprocess((v) => {
    const n = Number(Array.isArray(v) ? v[0] : v);
    return Number.isFinite(n) ? Math.floor(n) : PAGE_STEP;
  }, z.number().int().min(PAGE_STEP).max(600))
  .catch(PAGE_STEP);

export const catalogQuerySchema = z.object({
  q: text,
  "danh-muc": multi,
  "thuong-hieu": multi,
  mau: multi,
  size: multi,
  /** 0 nghĩa là không đặt cận. */
  "gia-tu": money,
  "gia-den": money,
  km: flag,
  "sap-xep": z.enum(["moi-nhat", "gia-tang", "gia-giam", "ban-chay"]).catch("moi-nhat"),
  xem: shown,
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

/** URL do khách sửa tay không được làm sập trang, chỉ rơi về mặc định. */
export function parseCatalogQuery(params: RawSearchParams): CatalogQuery {
  const q = catalogQuerySchema.parse(params);
  // Nhập ngược (từ 900k đến 200k) thì đảo lại thay vì trả về rỗng khó hiểu.
  if (q["gia-tu"] && q["gia-den"] && q["gia-tu"] > q["gia-den"]) {
    return { ...q, "gia-tu": q["gia-den"], "gia-den": q["gia-tu"] };
  }
  return q;
}

/** Ngược lại của `parseCatalogQuery`; mọi link trên trang dựng từ đây. */
export function serializeCatalogQuery(q: CatalogQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  for (const key of ["danh-muc", "thuong-hieu", "mau", "size"] as const) {
    if (q[key].length) sp.set(key, q[key].join(","));
  }
  if (q["gia-tu"] > 0) sp.set("gia-tu", String(q["gia-tu"]));
  if (q["gia-den"] > 0) sp.set("gia-den", String(q["gia-den"]));
  if (q.km) sp.set("km", "1");
  if (q["sap-xep"] !== "moi-nhat") sp.set("sap-xep", q["sap-xep"]);
  if (q.xem !== PAGE_STEP) sp.set("xem", String(q.xem));
  return sp;
}

/** Có bộ lọc nào đang bật không (không tính sắp xếp và số sản phẩm đã mở). */
export function hasActiveFilters(q: CatalogQuery): boolean {
  return (
    q.q !== "" ||
    q.km ||
    q["gia-tu"] > 0 ||
    q["gia-den"] > 0 ||
    q["danh-muc"].length > 0 ||
    q["thuong-hieu"].length > 0 ||
    q.mau.length > 0 ||
    q.size.length > 0
  );
}

export function countActiveFilters(q: CatalogQuery): number {
  return (
    q["danh-muc"].length +
    q["thuong-hieu"].length +
    q.mau.length +
    q.size.length +
    (q["gia-tu"] || q["gia-den"] ? 1 : 0) +
    (q.km ? 1 : 0)
  );
}

/** Câu mô tả bộ lọc đang bật — dùng trong trạng thái rỗng. */
export function describeFilters(q: CatalogQuery, categoryName?: string): string {
  const parts: string[] = [];
  if (q.q) parts.push(`từ khoá “${q.q}”`);
  if (categoryName) parts.push(categoryName.toLowerCase());
  else if (q["danh-muc"].length) parts.push(q["danh-muc"].join(", "));
  if (q.mau.length) parts.push("màu " + q.mau.join(", "));
  if (q.size.length) parts.push("size " + q.size.join(", "));
  if (q["thuong-hieu"].length) parts.push(q["thuong-hieu"].join(", "));
  // Giá là lý do hay gặp nhất khiến không còn sản phẩm nào, nên phải nêu tên.
  if (q["gia-tu"] && q["gia-den"]) parts.push(`giá ${q["gia-tu"]}–${q["gia-den"]} ₫`);
  else if (q["gia-den"]) parts.push(`giá ≤ ${q["gia-den"]} ₫`);
  else if (q["gia-tu"]) parts.push(`giá ≥ ${q["gia-tu"]} ₫`);
  if (q.km) parts.push("chỉ hàng giảm giá");
  return parts.length ? parts.join(" · ") : "không có điều kiện nào";
}

/* ── Phạm vi truy vấn và số đếm ───────────────────────────── */

/** Chiều bị bỏ qua khi đếm facet — đếm của một chiều không tự loại trừ chính nó. */
export type Dim = "danh-muc" | "thuong-hieu" | "mau" | "size" | "gia" | "km";

export type Scope = {
  /** Khoá cứng theo danh mục (trang /danh-muc/[slug]). */
  categorySlug?: string;
  skip?: Dim;
};

export type FacetOption = { value: string; label: string; count: number; hex?: string };

export type Facets = {
  categories: FacetOption[];
  brands: FacetOption[];
  colors: FacetOption[];
  sizes: FacetOption[];
  sale: number;
  /** Gợi ý cho placeholder của hai ô giá. */
  priceFloor: number;
  priceCeil: number;
};

/* ── Giá ──────────────────────────────────────────────────── */

export function effectivePrice(p: { basePrice: number; salePrice: number | null }): number {
  return p.salePrice ?? p.basePrice;
}

export function discountPercent(p: { basePrice: number; salePrice: number | null }): number | null {
  if (!p.salePrice || p.salePrice >= p.basePrice) return null;
  return Math.round(((p.basePrice - p.salePrice) / p.basePrice) * 100);
}
