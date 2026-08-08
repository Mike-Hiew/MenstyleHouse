import type { OrderStatus } from "@prisma/client";

/**
 * Trạng thái đơn được tính là "đã bán".
 *
 * Đơn huỷ và đơn trả hàng **không** tính: chúng đã được hoàn tồn, hoàn điểm và
 * trả lại lượt mã giảm giá; đếm vào là đếm hàng chưa bao giờ rời cửa hàng.
 *
 * Nằm ở `lib` chứ không nằm trong module báo cáo vì cả **báo cáo doanh thu**
 * lẫn **số "đã bán" ngoài trang chủ** đều đọc từ đây. Hai chỗ đếm theo hai danh
 * sách khác nhau là chuyện chủ cửa hàng phát hiện ra rồi hỏi tại sao trang chủ
 * ghi bán 120 mà báo cáo ghi 96 — và không ai trả lời được.
 */
export const TINH_DA_BAN = [
  "PENDING",
  "CONFIRMED",
  "PACKING",
  "SHIPPING",
  "DELIVERED",
] as const satisfies readonly OrderStatus[];
