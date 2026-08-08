import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Ảnh sản phẩm phủ kín khung cha.
 *
 * Dùng `fill` chứ không truyền width/height: ảnh trong DB và ảnh link ngoài có
 * kích thước gốc khác nhau, còn khung thì luôn do layout quyết định (tỉ lệ 3/4
 * hoặc một ô cố định). Kèm theo là hai ràng buộc:
 *
 * - Thẻ cha **phải** có `relative` và kích thước xác định, nếu không ảnh sẽ
 *   phủ ra tổ tiên gần nhất có position.
 * - `sizes` phải mô tả đúng bề rộng thật ở từng breakpoint. Sai chỗ này thì
 *   Next tải ảnh to hơn cần — đúng thứ M4.5 muốn tránh.
 */
export function Photo({
  src,
  alt,
  sizes,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("grayscale-photo object-cover", className)}
    />
  );
}
