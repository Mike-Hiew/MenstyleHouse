/**
 * Sinh slug và SKU.
 *
 * Thuần, không đụng DB, để test được từng luật một. Phần chống trùng nằm ở
 * `src/server/admin/catalog-admin.ts` vì nó cần hỏi DB.
 */

/**
 * Bỏ dấu tiếng Việt rồi rút về `a-z0-9-`.
 *
 * `đ`/`Đ` phải xử lý riêng: nó không phải `d` cộng dấu phụ nên `NFD` không tách
 * ra được, bỏ qua thì "Đồ nam" thành "nam" — mất hẳn chữ đầu.
 */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Thêm hậu tố `-2`, `-3`… cho tới khi không đụng cái nào đang có. */
export function uniqueSlug(base: string, daCo: Iterable<string>): string {
  const set = new Set(daCo);
  const goc = slugify(base) || "san-pham";
  if (!set.has(goc)) return goc;
  for (let i = 2; ; i++) {
    const thu = `${goc}-${i}`;
    if (!set.has(thu)) return thu;
  }
}

/** Tiền tố mã sản phẩm — trùng với seed và với SKU đang chạy thật. */
export const MA_PREFIX = "MSH";

/**
 * `MSH-136` — mã sản phẩm. Số lấy từ mã lớn nhất đang có, cộng một.
 *
 * Không dùng số lượng sản phẩm làm số thứ tự: xoá một sản phẩm là mã bắt đầu
 * đụng lại mã cũ, và SKU cũ trong đơn hàng đã lưu sẽ chỉ sang hàng khác.
 */
export function nextProductCode(daCo: Iterable<string>): string {
  let max = 100;
  for (const ma of daCo) {
    const n = Number(ma.split("-").at(-1));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${MA_PREFIX}-${max + 1}`;
}

/**
 * `MSH-136-BE-L` — mã sản phẩm, ba ký tự đầu của màu, rồi size.
 *
 * Giữ đúng cách seed đang sinh để SKU cũ và SKU mới cùng một hình dạng; nhân
 * viên kho đọc mã trên tem không phải đoán cái nào thuộc thời nào.
 */
export function buildSku(productCode: string, color: string, size: string): string {
  const mau = slugify(color).replace(/-/g, "").slice(0, 3).toUpperCase();
  const co = slugify(size).replace(/-/g, "").toUpperCase();
  return [productCode, mau, co].filter(Boolean).join("-");
}

/** Đúng dạng `#rrggbb`. Ô chọn màu của trình duyệt luôn trả về dạng này. */
export function isHexColor(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v.trim());
}
