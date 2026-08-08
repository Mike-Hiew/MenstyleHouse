import type { TicketStatus } from "@prisma/client";

/**
 * Nhãn trạng thái yêu cầu hỗ trợ.
 *
 * Nằm ở `lib/` chứ không ở `server/`: khối trao đổi trong admin là client
 * component và cũng cần đúng những nhãn này. `src/server/*` có `server-only`
 * nên import từ đó vào client là vỡ bundle.
 */
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Mới",
  PENDING: "Đang xử lý",
  RESOLVED: "Đã trả lời",
  CLOSED: "Đã đóng",
};
