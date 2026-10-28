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
} as const;
