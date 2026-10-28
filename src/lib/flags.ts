/**
 * Cờ bật/tắt các phần của giao diện v2. Mỗi phần tắt được riêng, để gỡ ra khi
 * có sự cố mà không phải triển khai lại mã.
 *
 * Đọc từ biến `NEXT_PUBLIC_FF_*` lúc build: client component cũng cần đọc,
 * và Next chỉ nhúng biến có tiền tố `NEXT_PUBLIC_` vào bundle trình duyệt.
 * Đặt `"0"` là tắt, bỏ trống là theo mặc định bên dưới.
 *
 * Phải viết tên biến đầy đủ từng dòng — Next thay `process.env.NEXT_PUBLIC_X`
 * bằng giá trị lúc build, còn tra động `process.env[ten]` thì ra `undefined`.
 */
function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value !== "0" && value !== "false";
}

export const FLAGS = {
  /** Mục 2: ngăn kéo giỏ hàng + hiệu ứng bay vào giỏ. */
  cartDrawer: flag(process.env.NEXT_PUBLIC_FF_CART_DRAWER, true),
  /** Mục 3: bộ gợi ý size (khối ở trang chủ + sheet ở trang sản phẩm). */
  sizeFinder: flag(process.env.NEXT_PUBLIC_FF_SIZE_FINDER, true),
  /**
   * Mục 4: bổ sung trang sản phẩm — kính lúp, chip thông số, đổi ảnh theo màu,
   * thanh mua nổi trên mobile.
   */
  pdpExtras: flag(process.env.NEXT_PUBLIC_FF_PDP_EXTRAS, true),
  /**
   * Mục 5 — thẻ sản phẩm: nền ám màu sản phẩm, rê chuột đổi sang ảnh mặc trên
   * người, hàng nút size thêm nhanh.
   */
  cardExtras: flag(process.env.NEXT_PUBLIC_FF_CARD_EXTRAS, true),
  /** Mục 5 — "Mới về tuần này" thành dải cuộn ngang (tắt: lưới 4 ô như cũ). */
  homeRail: flag(process.env.NEXT_PUBLIC_FF_HOME_RAIL, true),
  /** Mục 5 — khối "Mặc thử nguyên bộ" (shop the look) ở trang chủ. */
  lookbook: flag(process.env.NEXT_PUBLIC_FF_LOOKBOOK, true),
  /**
   * Mục 5 — khối Fit Lab. **Mặc định TẮT**: số liệu trong
   * `src/content/fit-lab.ts` còn là số giữ chỗ, chỉ bật khi đã có số đo thật.
   */
  fitLab: flag(process.env.NEXT_PUBLIC_FF_FIT_LAB, false),
  /**
   * Mục 6 — hero ghim khi cuộn: ảnh nở ra tràn màn hình, chữ "đứng form" giãn
   * bề ngang, cuối cùng hiện tiêu đề trắng + thẻ sản phẩm. Chỉ từ tablet trở
   * lên; điện thoại luôn là hero cũ.
   */
  heroStage: flag(process.env.NEXT_PUBLIC_FF_HERO_STAGE, true),
} as const;
