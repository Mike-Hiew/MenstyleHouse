import "server-only";
import { Prisma, type OrderStatus, type PaymentStatus , type Carrier } from "@prisma/client";
import { db } from "@/lib/db";
import { CARRIER_LABEL } from "@/lib/carriers";
import { getSettings } from "@/server/settings";
import { TABLE_PAGE_SIZE, type TableQuery } from "@/lib/table-params";

/**
 * Đơn hàng phía quản trị: danh sách có tab/tìm/sắp xếp và máy trạng thái.
 */

/**
 * Máy trạng thái đơn. Kiểm ở **server**, không chỉ ẩn nút ở UI
 * (`docs/CLAUDE-rules.md`). Chỉ đi tiến từng nấc, không nhảy cóc.
 */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKING", "CANCELLED"],
  PACKING: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PACKING: "Đang đóng gói",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã huỷ",
  RETURNED: "Đã trả hàng",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Chưa trả",
  PAID: "Đã trả",
  REFUNDED: "Đã hoàn",
  PARTIAL_REFUND: "Hoàn một phần",
  FAILED: "Thất bại",
};

/** Tab của bảng đơn — khớp các nhóm nhân viên hay lọc. */
export const ORDER_TABS = [
  { key: "", label: "Tất cả", status: null },
  { key: "cho", label: "Chờ xác nhận", status: "PENDING" as OrderStatus },
  { key: "xac-nhan", label: "Đã xác nhận", status: "CONFIRMED" as OrderStatus },
  { key: "dong-goi", label: "Đóng gói", status: "PACKING" as OrderStatus },
  { key: "dang-giao", label: "Đang giao", status: "SHIPPING" as OrderStatus },
  { key: "da-giao", label: "Đã giao", status: "DELIVERED" as OrderStatus },
  { key: "huy", label: "Đã huỷ", status: "CANCELLED" as OrderStatus },
];

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(
      `Không chuyển được từ "${STATUS_LABEL[from]}" sang "${STATUS_LABEL[to]}". ` +
        `Từ đây chỉ đi tiếp được: ${NEXT_STATUS[from].map((s) => STATUS_LABEL[s]).join(", ") || "không còn bước nào"}.`,
    );
    this.name = "InvalidTransitionError";
  }
}

function whereFor(q: TableQuery) {
  const tab = ORDER_TABS.find((t) => t.key === q.tab);
  const and: Prisma.OrderWhereInput[] = [];

  if (tab?.status) and.push({ status: tab.status });

  if (q.q) {
    and.push({
      OR: [
        { code: { contains: q.q, mode: "insensitive" } },
        { receiver: { contains: q.q, mode: "insensitive" } },
        { phone: { contains: q.q } },
      ],
    });
  }

  return and.length ? { AND: and } : {};
}

const SORTABLE: Record<string, keyof Prisma.OrderOrderByWithRelationInput> = {
  code: "code",
  total: "total",
  createdAt: "createdAt",
};

export async function listOrders(q: TableQuery) {
  const where = whereFor(q);
  const orderByKey = SORTABLE[q.sap] ?? "createdAt";

  const [total, rows, tabCounts] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { [orderByKey]: q.chieu },
      skip: (q.trang - 1) * TABLE_PAGE_SIZE,
      take: TABLE_PAGE_SIZE,
      select: {
        id: true,
        code: true,
        receiver: true,
        phone: true,
        province: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        total: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const byStatus = new Map(tabCounts.map((r) => [r.status, r._count._all]));
  const allCount = tabCounts.reduce((n, r) => n + r._count._all, 0);

  return {
    rows,
    total,
    tabs: ORDER_TABS.map((t) => ({
      key: t.key,
      label: t.label,
      count: t.status ? (byStatus.get(t.status) ?? 0) : allCount,
    })),
  };
}

export type AdminOrderRow = Awaited<ReturnType<typeof listOrders>>["rows"][number];

const detailInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: true,
  events: { orderBy: { createdAt: "asc" } },
  payments: { orderBy: { createdAt: "asc" } },
  user: { select: { id: true, name: true, phone: true, pointBalance: true } },
  invoice: { select: { symbol: true, number: true } },
});

export type AdminOrderDetail = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;

export async function getOrderForAdmin(code: string): Promise<AdminOrderDetail | null> {
  return db.order.findUnique({ where: { code }, include: detailInclude });
}

/**
 * Chuyển trạng thái một nấc. `CANCELLED` đi qua `cancelOrder()` ở tầng
 * storefront vì còn phải hoàn tồn, hoàn điểm và trả lượt mã giảm giá.
 */
export async function advanceOrderStatus(
  code: string,
  to: OrderStatus,
  actorName: string,
  note?: string,
): Promise<void> {
  const order = await db.order.findUnique({
    where: { code },
    select: { id: true, status: true, carrier: true, trackingCode: true },
  });
  if (!order) throw new Error("Không tìm thấy đơn " + code);
  if (!NEXT_STATUS[order.status].includes(to)) {
    throw new InvalidTransitionError(order.status, to);
  }

  // Đơn "đang giao" mà không tra được ở đâu là đẩy việc sang tổng đài.
  if (to === "SHIPPING" && !sanSangGiao(order)) throw new MissingTrackingError();

  if (to === "CANCELLED") {
    const { cancelOrder } = await import("@/server/orders");
    await cancelOrder(code, actorName);
    // Cửa hàng huỷ đơn là việc khách không biết trước — phải báo.
    await baoKhachDoiTrangThai(code, "CANCELLED");
    return;
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: to,
        // Giao thành công cho đơn COD nghĩa là đã thu tiền.
        ...(to === "DELIVERED" ? { paymentStatus: "PAID" as PaymentStatus } : {}),
      },
    });
    await tx.orderEvent.create({
      data: { orderId: order.id, status: to, note: note || null, actorName },
    });
    if (to === "DELIVERED") {
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "UNPAID" },
        data: { status: "PAID", paidAt: new Date() },
      });
    }
  });

  // Điểm chỉ ghi khi đơn PAID *và* DELIVERED — hàm tự kiểm lại điều kiện.
  if (to === "DELIVERED") {
    const { awardPointsForOrder } = await import("@/server/accounts");
    await awardPointsForOrder(code);
  }

  await baoKhachDoiTrangThai(code, to);
}

/**
 * Báo cho khách khi đơn sang một nấc đáng biết.
 *
 * **Best-effort, đặt sau transaction.** Trạng thái đã ghi xong rồi; nhà cung
 * cấp mail chết mà kéo theo lỗi ở đây thì nhân viên thấy "đổi trạng thái thất
 * bại" và bấm lại, trong khi đơn đã chuyển.
 *
 * Chỉ ba nấc: rời kho, giao xong, huỷ. Báo cả "đã xác nhận" và "đang đóng gói"
 * là dội bốn cái thư cho một lần mua, và khách sẽ tắt thông báo.
 */
async function baoKhachDoiTrangThai(code: string, to: OrderStatus) {
  if (to !== "SHIPPING" && to !== "DELIVERED" && to !== "CANCELLED") return;

  try {
    const [don, caiDat] = await Promise.all([
      db.order.findUnique({
        where: { code },
        select: {
          email: true,
          receiver: true,
          trackingCode: true,
          carrier: true,
        },
      }),
      getSettings(),
    ]);
    if (!don?.email) return;

    const { mailTrangThaiDon } = await import("@/server/mail-templates");
    await mailTrangThaiDon({
      to: don.email,
      ten: don.receiver,
      maDon: code,
      trangThai: to,
      maVanDon: don.trackingCode,
      hangVanChuyen: don.carrier ? CARRIER_LABEL[don.carrier] : null,
      hotline: caiDat.hotline,
    });
  } catch (e) {
    console.error("[mail] không báo được trạng thái đơn", code, e);
  }
}

/** Hãng nào không có mã vận đơn để tra. */
const KHONG_CO_VAN_DON: Carrier[] = ["STORE_PICKUP"];

export class MissingTrackingError extends Error {
  constructor() {
    super(
      "Chuyển sang Đang giao thì phải có mã vận đơn để khách tra được. " +
        "Nhập mã ở khối Vận chuyển trước, hoặc đổi sang Nhận tại cửa hàng.",
    );
    this.name = "MissingTrackingError";
  }
}

/**
 * Ghi thông tin vận chuyển do nhân viên nhập tay.
 *
 * Chưa nối API hãng vận chuyển (M7), nên đây là đường duy nhất mã vận đơn vào
 * được hệ thống. Mỗi lần đổi đều để lại một dòng `OrderEvent`: ba tháng sau
 * khách khiếu nại "shop đưa nhầm mã" thì còn tra được ai nhập, lúc nào.
 */
export async function setShipping(
  code: string,
  input: { carrier: Carrier | null; trackingCode: string | null; actorName: string },
): Promise<void> {
  const order = await db.order.findUnique({
    where: { code },
    select: { id: true, status: true, carrier: true, trackingCode: true },
  });
  if (!order) throw new Error("Không tìm thấy đơn " + code);

  const ma = input.trackingCode?.trim() || null;
  if (order.carrier === input.carrier && order.trackingCode === ma) return;

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { carrier: input.carrier, trackingCode: ma },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: ma
          ? `Cập nhật vận chuyển: ${input.carrier ?? "chưa chọn hãng"} · ${ma}`
          : "Xoá mã vận đơn",
        actorName: input.actorName,
      },
    });
  });
}

/**
 * Đơn đã đủ điều kiện chuyển sang Đang giao chưa.
 *
 * Để đơn ở trạng thái "đang giao" mà không có mã tra cứu là đẩy việc sang tổng
 * đài: khách gọi hỏi hàng ở đâu và không ai trả lời được.
 */
export function sanSangGiao(order: { carrier: Carrier | null; trackingCode: string | null }) {
  if (order.carrier && KHONG_CO_VAN_DON.includes(order.carrier)) return true;
  return Boolean(order.trackingCode?.trim());
}
