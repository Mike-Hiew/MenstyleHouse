import { z } from "zod";

/**
 * Phần thuần của tầng catalog: đọc/ghi tham số URL, hằng số hiển thị, tính giá.
 * Không chạm Prisma nên client component import được. Truy vấn nằm ở
 * `src/server/catalog.ts`.
 */

export const PER_PAGE = 12;

export const SORTS = {
  "moi-nhat": "Mới nhất",
  "gia-tang": "Giá thấp → cao",
  "gia-giam": "Giá cao → thấp",
  "danh-gia": "Đánh giá cao",
} as const;

export type SortKey = keyof typeof SORTS;

/** Khoảng giá dựng sẵn — có số đếm nên dễ đọc hơn ô nhập tự do. */
export const PRICE_BUCKETS = [
  { key: "0-300", label: "Dưới 300.000đ", min: 0, max: 299_999 },
  { key: "300-500", label: "300.000đ – 500.000đ", min: 300_000, max: 500_000 },
  { key: "500-700", label: "500.000đ – 700.000đ", min: 500_001, max: 700_000 },
  { key: "700-", label: "Trên 700.000đ", min: 700_001, max: null },
] as const;

/** Thứ tự size khi hiển thị — chữ trước, số sau, Freesize cuối. */
const SIZE_ORDER = ["S", "M", "L", "XL", "XXL", "29", "30", "31", "32", "34", "36", "Freesize"];

export function compareSizes(a: string, b: string): number {
  const ra = SIZE_ORDER.indexOf(a);
  const rb = SIZE_ORDER.indexOf(b);
  return (ra === -1 ? SIZE_ORDER.length : ra) - (rb === -1 ? SIZE_ORDER.length : rb);
}

/* ── Phân tích tham số URL ────────────────────────────────── */

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Nhận cả `?mau=Đen&mau=Navy` lẫn `?mau=Đen,Navy`, bỏ trùng. */
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

const pageNum = z
  .preprocess((v) => {
    const n = Number(Array.isArray(v) ? v[0] : v);
    return Number.isFinite(n) ? Math.floor(n) : 1;
  }, z.number().int().min(1).max(500))
  .catch(1);

export const catalogQuerySchema = z.object({
  q: text,
  "danh-muc": multi,
  "thuong-hieu": multi,
  mau: multi,
  size: multi,
  gia: multi,
  km: flag,
  "sap-xep": z.enum(["moi-nhat", "gia-tang", "gia-giam", "danh-gia"]).catch("moi-nhat"),
  trang: pageNum,
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

/** URL do khách sửa tay không được làm sập trang, chỉ rơi về mặc định. */
export function parseCatalogQuery(params: RawSearchParams): CatalogQuery {
  return catalogQuerySchema.parse(params);
}

/**
 * Ngược lại của `parseCatalogQuery`. Mọi link trên trang dựng từ đây nên URL
 * luôn chuẩn hoá — tham số lạ trong URL khách dán vào không lọt ra ngoài.
 */
export function serializeCatalogQuery(q: CatalogQuery): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  for (const key of ["danh-muc", "thuong-hieu", "mau", "size", "gia"] as const) {
    if (q[key].length) sp.set(key, q[key].join(","));
  }
  if (q.km) sp.set("km", "1");
  if (q["sap-xep"] !== "moi-nhat") sp.set("sap-xep", q["sap-xep"]);
  if (q.trang > 1) sp.set("trang", String(q.trang));
  return sp;
}

/** Có bộ lọc nào đang bật không (không tính sắp xếp và phân trang). */
export function hasActiveFilters(q: CatalogQuery): boolean {
  return (
    q.q !== "" ||
    q.km ||
    q["danh-muc"].length > 0 ||
    q["thuong-hieu"].length > 0 ||
    q.mau.length > 0 ||
    q.size.length > 0 ||
    q.gia.length > 0
  );
}

export function countActiveFilters(q: CatalogQuery): number {
  return (
    q["danh-muc"].length +
    q["thuong-hieu"].length +
    q.mau.length +
    q.size.length +
    q.gia.length +
    (q.km ? 1 : 0)
  );
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
  prices: FacetOption[];
  sale: number;
};

/* ── Giá ──────────────────────────────────────────────────── */

/** Giá thực tế hiển thị trên thẻ sản phẩm. */
export function effectivePrice(p: { basePrice: number; salePrice: number | null }): number {
  return p.salePrice ?? p.basePrice;
}

export function discountPercent(p: { basePrice: number; salePrice: number | null }): number | null {
  if (!p.salePrice || p.salePrice >= p.basePrice) return null;
  return Math.round(((p.basePrice - p.salePrice) / p.basePrice) * 100);
}
