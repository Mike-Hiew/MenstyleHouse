import "server-only";
import { Prisma, type TicketStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { TABLE_PAGE_SIZE, type TableQuery } from "@/lib/table-params";

/**
 * Hộp thư hỗ trợ phía admin.
 *
 * Trả lời là **thêm** một tin nhắn, không sửa tin cũ. Yêu cầu đã đóng thì không
 * nhận thêm tin — muốn nói tiếp phải mở lại, để lịch sử luôn đọc được theo đúng
 * thứ tự đã xảy ra.
 */

export class TicketClosedError extends Error {
  constructor(code: string) {
    super(`Yêu cầu ${code} đã đóng. Mở lại trước khi trả lời tiếp.`);
    this.name = "TicketClosedError";
  }
}

const TABS = [
  { key: "", label: "Tất cả", status: null },
  { key: "moi", label: "Mới", status: "OPEN" as const },
  { key: "dang-xu-ly", label: "Đang xử lý", status: "PENDING" as const },
  { key: "da-dong", label: "Đã đóng", status: "CLOSED" as const },
];

const SORTABLE: Record<string, "code" | "subject" | "status" | "createdAt"> = {
  code: "code",
  subject: "subject",
  status: "status",
  date: "createdAt",
};

export async function listTickets(q: TableQuery) {
  const tab = TABS.find((t) => t.key === q.tab);
  const and: Prisma.TicketWhereInput[] = [];
  if (tab?.status) and.push({ status: tab.status });
  if (q.q) {
    const tim = q.q.trim();
    and.push({
      OR: [
        { code: { contains: tim, mode: "insensitive" } },
        { subject: { contains: tim, mode: "insensitive" } },
        { orderCode: { contains: tim, mode: "insensitive" } },
        { messages: { some: { authorName: { contains: tim, mode: "insensitive" } } } },
      ],
    });
  }
  const where = and.length ? { AND: and } : {};

  const [rows, total, chuaXuLy, counts] = await Promise.all([
    db.ticket.findMany({
      where,
      orderBy: { [SORTABLE[q.sap] ?? "createdAt"]: q.chieu },
      skip: (q.trang - 1) * TABLE_PAGE_SIZE,
      take: TABLE_PAGE_SIZE,
      select: {
        id: true,
        code: true,
        subject: true,
        status: true,
        orderCode: true,
        createdAt: true,
        messages: { take: 1, orderBy: { createdAt: "asc" }, select: { authorName: true } },
      },
    }),
    db.ticket.count({ where }),
    db.ticket.count({ where: { status: { in: ["OPEN", "PENDING"] } } }),
    db.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const theoTrangThai = new Map(counts.map((c) => [c.status, c._count._all]));
  const tatCa = counts.reduce((n, c) => n + c._count._all, 0);

  return {
    rows,
    total,
    chuaXuLy,
    tabs: TABS.map((t) => ({
      key: t.key,
      label: t.label,
      count: t.status ? (theoTrangThai.get(t.status) ?? 0) : tatCa,
    })),
  };
}

export type TicketRow = Awaited<ReturnType<typeof listTickets>>["rows"][number];

export async function getTicket(code: string) {
  return db.ticket.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      subject: true,
      status: true,
      orderCode: true,
      channel: true,
      createdAt: true,
      user: { select: { name: true, phone: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, authorName: true, isStaff: true, body: true, createdAt: true },
      },
    },
  });
}

export type TicketDetail = NonNullable<Awaited<ReturnType<typeof getTicket>>>;

/**
 * Trả lời khách. Trạng thái tự chuyển sang "Đã trả lời" nếu nhân viên không
 * chọn khác — không ai muốn phải bấm hai lần cho một việc.
 */
export async function replyTicket(
  code: string,
  input: { body: string; actorName: string; status?: TicketStatus },
) {
  const t = await db.ticket.findUnique({ where: { code }, select: { id: true, status: true } });
  if (!t) throw new Error("Không tìm thấy yêu cầu " + code);
  if (t.status === "CLOSED" && input.status !== "PENDING") throw new TicketClosedError(code);

  return db.$transaction(async (tx) => {
    await tx.ticketMessage.create({
      data: { ticketId: t.id, authorName: input.actorName, isStaff: true, body: input.body },
    });
    return tx.ticket.update({
      where: { id: t.id },
      data: { status: input.status ?? "RESOLVED" },
      select: { status: true },
    });
  });
}

/** Đổi trạng thái mà không gửi tin — dùng để đóng hoặc mở lại. */
export async function setTicketStatus(code: string, status: TicketStatus) {
  return db.ticket.update({ where: { code }, data: { status }, select: { status: true } });
}
