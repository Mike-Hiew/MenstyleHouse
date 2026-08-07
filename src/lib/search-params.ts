/**
 * Chỉnh sửa query string cho bộ lọc catalog. Dùng chung giữa server (phân trang,
 * link xoá lọc) và client (FilterBar) để URL luôn cùng một định dạng.
 */

/** Giá trị nhiều lựa chọn lưu dạng `?mau=Đen,Navy` — ngắn và dễ đọc. */
export function readList(sp: URLSearchParams, key: string): string[] {
  const raw = sp.get(key);
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function writeList(sp: URLSearchParams, key: string, values: string[]) {
  if (values.length) sp.set(key, values.join(","));
  else sp.delete(key);
}

/** Bật/tắt một giá trị trong bộ lọc nhiều lựa chọn. Luôn về trang 1. */
export function toggleValue(current: URLSearchParams, key: string, value: string): URLSearchParams {
  const sp = new URLSearchParams(current);
  const list = readList(sp, key);
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  writeList(sp, key, next);
  sp.delete("trang");
  return sp;
}

export function setValue(
  current: URLSearchParams,
  key: string,
  value: string | null,
): URLSearchParams {
  const sp = new URLSearchParams(current);
  if (value === null || value === "") sp.delete(key);
  else sp.set(key, value);
  if (key !== "trang") sp.delete("trang");
  return sp;
}

/** Giữ nguyên bộ lọc, chỉ đổi trang. */
export function setPage(current: URLSearchParams, page: number): URLSearchParams {
  const sp = new URLSearchParams(current);
  if (page <= 1) sp.delete("trang");
  else sp.set("trang", String(page));
  return sp;
}

/** Xoá toàn bộ bộ lọc nhưng giữ từ khoá tìm kiếm và kiểu sắp xếp. */
export function clearFilters(current: URLSearchParams): URLSearchParams {
  const sp = new URLSearchParams();
  const q = current.get("q");
  const sort = current.get("sap-xep");
  if (q) sp.set("q", q);
  if (sort) sp.set("sap-xep", sort);
  return sp;
}

/** Chuỗi truy vấn có dấu `?` ở đầu, hoặc rỗng — nối thẳng vào href được. */
export function qs(sp: URLSearchParams): string {
  const s = sp.toString();
  return s ? "?" + s : "";
}
