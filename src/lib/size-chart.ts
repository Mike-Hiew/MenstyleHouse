import type { MeasureKey, MeasureOf, MeasureUnit } from "@prisma/client";

/**
 * Hình dạng một bảng size khi hiện ra ngoài trang sản phẩm.
 *
 * Trước M6.18 file này còn giữ **ba bảng viết cứng** và một ánh xạ theo slug
 * danh mục — thêm nhóm hàng mới là phải sửa mã và triển khai lại, còn cửa hàng
 * thì không tự đổi được một con số nào. Dữ liệu giờ nằm trong bảng `SizeChart`,
 * quản lý ở `/admin/bang-size`; ở đây chỉ còn lại kiểu, dùng chung giữa server
 * và component hiển thị.
 *
 * Từ M6.19 mỗi cột mang thêm `key`/`of`/`unit` và mỗi ô là **khoảng số** chứ
 * không phải chuỗi. Đọc `docO`/`dinhDangO` bên dưới để biết vì sao.
 */

export type CotSize = {
  label: string;
  /** `null` = cột chữ tự do, không đo được thành số. */
  key: MeasureKey | null;
  of: MeasureOf;
  unit: MeasureUnit;
};

/** Một ô: hoặc khoảng số, hoặc chữ, hoặc bỏ trống. */
export type OSize =
  | { loai: "so"; min: number; max: number }
  | { loai: "chu"; text: string }
  | { loai: "trong" };

export type DongSize = {
  size: string;
  /** Xếp đúng thứ tự `SizeChart.columns`; luôn cùng độ dài với nó. */
  o: OSize[];
};

export type SizeChart = {
  title: string;
  columns: CotSize[];
  rows: DongSize[];
  fit: string;
  howTo: string[];
};

const KY_HIEU: Record<MeasureUnit, string> = { CM: "cm", INCH: "inch", KG: "kg" };

/** Ký hiệu đơn vị để in sau con số. */
export function kyHieuDonVi(unit: MeasureUnit): string {
  return KY_HIEU[unit];
}

/**
 * Đọc một ô người dùng gõ vào thành dữ liệu có kiểu.
 *
 * Nhận `"100"`, `"16.5"`, `"88-92"`, `"88 – 92"` (cả gạch ngang dài). Thứ không
 * ra số thì **giữ nguyên làm chữ chứ không vứt đi** — cửa hàng vẫn cần ghi được
 * những ghi chú không đo được, và làm mất dữ liệu người ta đã gõ là tệ hơn nhiều
 * so với việc một ô không tính toán được.
 */
export function docO(raw: string): OSize {
  const s = raw.trim();
  if (!s) return { loai: "trong" };

  const m = s.replace(/[–—]/g, "-").match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:-\s*(\d+(?:[.,]\d+)?))?\s*$/);
  if (!m) return { loai: "chu", text: s };

  const so = (v: string) => Number(v.replace(",", "."));
  const min = so(m[1]);
  const max = m[2] === undefined ? min : so(m[2]);
  // Gõ ngược "92-88" thì hiểu theo nghĩa đen chứ không im lặng đảo lại: khoảng
  // ngược là dấu hiệu gõ nhầm, và nó lộ ra ngay khi nhìn bảng.
  return { loai: "so", min, max };
}

/** Chữ hiện trong ô của bảng. Không kèm đơn vị — đơn vị in ở đầu cột. */
export function dinhDangO(o: OSize): string {
  switch (o.loai) {
    case "trong":
      return "—";
    case "chu":
      return o.text;
    case "so":
      return o.min === o.max ? String(o.min) : `${o.min}–${o.max}`;
  }
}

/** Ô về lại dạng người gõ, để đổ ngược vào ô nhập bên quản trị. */
export function oThanhChuoi(o: OSize): string {
  switch (o.loai) {
    case "trong":
      return "";
    case "chu":
      return o.text;
    case "so":
      return o.min === o.max ? String(o.min) : `${o.min}-${o.max}`;
  }
}

/**
 * So nhãn size của biến thể với nhãn dòng trong bảng.
 *
 * `Variant.size` và `SizeChartRow.size` là hai chuỗi rời nhau, không có khoá
 * ngoại nối. Chuẩn hoá ở một chỗ để `"M"`, `"m"` và `" M "` cùng khớp — chứ để
 * mỗi nơi tự so thì sớm muộn có chỗ so thiếu.
 */
export function cungSize(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
