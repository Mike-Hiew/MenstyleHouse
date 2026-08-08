/**
 * Chỉnh sửa query string cho bộ lọc catalog. Dùng chung giữa server (nút tải
 * thêm) và client (bộ lọc) để URL luôn cùng một định dạng.
 *
 * Mọi thao tác đổi bộ lọc đều đặt lại số sản phẩm đang mở (`xem`) — nếu không,
 * khách đã bấm "Tải thêm" ba lần rồi đổi danh mục sẽ tải 48 sản phẩm một lúc.
 */

export function readList(sp: URLSearchParams, key: string): string[] {
  const raw = sp.get(key);
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function writeList(sp: URLSearchParams, key: string, values: string[]) {
  if (values.length) sp.set(key, values.join(","));
  else sp.delete(key);
}

/** Bật/tắt một giá trị trong bộ lọc nhiều lựa chọn (size, thương hiệu). */
export function toggleValue(current: URLSearchParams, key: string, value: string): URLSearchParams {
  const sp = new URLSearchParams(current);
  const list = readList(sp, key);
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  writeList(sp, key, next);
  sp.delete("xem");
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
  if (key !== "xem") sp.delete("xem");
  return sp;
}

/** Mở thêm một lô sản phẩm, giữ nguyên bộ lọc. */
export function setShown(current: URLSearchParams, shown: number): URLSearchParams {
  const sp = new URLSearchParams(current);
  sp.set("xem", String(shown));
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
