import { z } from "zod";

/**
 * Tham số của mọi bảng admin nằm trên URL — chia sẻ link được, bấm Back đúng,
 * không giữ trạng thái ẩn trong component. Cùng cách làm với bộ lọc catalog.
 */

export const TABLE_PAGE_SIZE = 20;

const text = z
  .preprocess((v) => {
    const s = Array.isArray(v) ? v[0] : v;
    return typeof s === "string" ? s.trim().slice(0, 80) : "";
  }, z.string())
  .catch("");

const page = z
  .preprocess((v) => {
    const n = Number(Array.isArray(v) ? v[0] : v);
    return Number.isFinite(n) ? Math.floor(n) : 1;
  }, z.number().int().min(1).max(10_000))
  .catch(1);

export const tableQuerySchema = z.object({
  q: text,
  tab: text,
  trang: page,
  sap: text,
  chieu: z.enum(["asc", "desc"]).catch("desc"),
});

export type TableQuery = z.infer<typeof tableQuerySchema>;

export type RawParams = Record<string, string | string[] | undefined>;

export function parseTableQuery(raw: RawParams): TableQuery {
  return tableQuerySchema.parse(raw);
}

export function serializeTableQuery(q: TableQuery, extra: Record<string, string> = {}) {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  if (q.tab) sp.set("tab", q.tab);
  if (q.trang > 1) sp.set("trang", String(q.trang));
  if (q.sap) {
    sp.set("sap", q.sap);
    if (q.chieu !== "desc") sp.set("chieu", q.chieu);
  }
  for (const [k, v] of Object.entries(extra)) if (v) sp.set(k, v);
  return sp;
}

/** Đổi một tham số và luôn về trang 1 — trừ chính tham số trang. */
export function withParam(current: URLSearchParams, key: string, value: string | null) {
  const sp = new URLSearchParams(current);
  if (value === null || value === "") sp.delete(key);
  else sp.set(key, value);
  if (key !== "trang") sp.delete("trang");
  return sp;
}

/** Bấm lại đúng cột đang sắp thì đảo chiều. */
export function withSort(current: URLSearchParams, column: string) {
  const sp = new URLSearchParams(current);
  const same = sp.get("sap") === column;
  sp.set("sap", column);
  sp.set("chieu", same && sp.get("chieu") !== "asc" ? "asc" : "desc");
  sp.delete("trang");
  return sp;
}

export function qs(sp: URLSearchParams): string {
  const s = sp.toString();
  return s ? "?" + s : "";
}
