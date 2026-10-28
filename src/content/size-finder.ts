import type { SizeRange } from "@/lib/size-finder";

/**
 * Cấu hình bộ gợi ý size.
 *
 * Nguồn chính là cột Chiều cao / Cân nặng của bảng size trong DB — cửa hàng sửa ở
 * `/admin/bang-size`, không cần sửa file này. Bảng dưới đây chỉ dùng khi DB
 * chưa có bảng nào đọc được (ví dụ DB mới chưa nạp bảng size).
 *
 * TODO(cửa hàng): thay bằng số đo thật. Hiện chép từ bảng size "Áo" mẫu.
 */
export const DEFAULT_TOP_RANGES: SizeRange[] = [
  { size: "S", height: [160, 166], weight: [52, 58] },
  { size: "M", height: [165, 172], weight: [57, 65] },
  { size: "L", height: [170, 176], weight: [64, 72] },
  { size: "XL", height: [174, 180], weight: [71, 80] },
  { size: "XXL", height: [178, 185], weight: [79, 90] },
];

/** Bảng size dùng cho khối "Size của bạn, trong 10 giây" ở trang chủ (theo slug). */
export const HOME_SIZE_CHART_SLUG = "ao";

/** Giới hạn hai thanh trượt — đúng mockup: 150–192cm, 45–90kg. */
export const SLIDER = {
  height: { min: 150, max: 192, start: 172 },
  weight: { min: 45, max: 90, start: 68 },
} as const;
