import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { nextCode } from "@/lib/codes";

/**
 * Yêu cầu hỗ trợ.
 *
 * Khách gửi từ form liên hệ ở storefront, nhân viên trả lời trong admin. Mỗi
 * lượt trao đổi là một `TicketMessage`, không ghi đè nội dung cũ — tranh chấp
 * đổi trả về sau đọc lại được đúng thứ hai bên đã nói.
 */

export { TICKET_STATUS_LABEL } from "@/lib/tickets";

export const ticketSchema = z.object({
  name: z.string().trim().min(2, "Nhập tên của bạn").max(80),
  contact: z
    .string()
    .trim()
    .min(5, "Nhập email hoặc số điện thoại")
    .max(120)
    .refine(
      (v) => /^0\d{9}$/.test(v) || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
      "Nhập email hợp lệ hoặc số điện thoại 10 số bắt đầu bằng 0",
    ),
  orderCode: z.string().trim().max(32).optional(),
  subject: z.string().trim().min(5, "Nêu ngắn gọn vấn đề").max(160),
  body: z.string().trim().min(10, "Mô tả thêm để cửa hàng hiểu vấn đề").max(2000),
});

export type TicketInput = z.infer<typeof ticketSchema>;

/**
 * Tạo yêu cầu kèm tin nhắn đầu tiên.
 *
 * `orderCode` chỉ **ghi lại như khách khai**, không ràng buộc khoá ngoại: khách
 * gõ nhầm mã đơn thì yêu cầu vẫn phải vào được hộp thư, chứ không phải bị chặn
 * ở form rồi bỏ đi.
 */
export async function createTicket(input: TicketInput, userId: string | null) {
  /*
   * Phiên đăng nhập có thể còn hiệu lực trong khi tài khoản đã bị xoá. Gắn
   * thẳng `userId` chết vào đây là khoá ngoại nổ và **yêu cầu của khách mất
   * trắng** — thứ tệ nhất có thể xảy ra với một form hỗ trợ. Không tra ra người
   * thì cứ lập dưới dạng khách vãng lai, nội dung vẫn tới nơi.
   */
  const chuNhan = userId
    ? await db.user.findUnique({ where: { id: userId }, select: { id: true } })
    : null;

  return db.$transaction(async (tx) => {
    const code = await nextCode(tx, "TIC");

    return tx.ticket.create({
      data: {
        code,
        userId: chuNhan?.id ?? null,
        orderCode: input.orderCode?.trim() || null,
        subject: input.subject,
        status: "OPEN",
        channel: "web",
        messages: {
          create: {
            authorName: `${input.name} · ${input.contact}`,
            isStaff: false,
            body: input.body,
          },
        },
      },
      select: { id: true, code: true },
    });
  });
}

/** Tra một yêu cầu bằng mã — khách xem lại được mà không cần tài khoản. */
export async function getTicketByCode(code: string) {
  return db.ticket.findUnique({
    where: { code: code.trim().toUpperCase() },
    select: {
      code: true,
      subject: true,
      status: true,
      orderCode: true,
      createdAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, authorName: true, isStaff: true, body: true, createdAt: true },
      },
    },
  });
}
