import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { splitVat } from "@/lib/money";
import { getSettings } from "@/server/settings";
import { TABLE_PAGE_SIZE, type TableQuery } from "@/lib/table-params";

/**
 * Hoá đơn GTGT.
 *
 * Hai thứ quyết định cách viết file này:
 *
 * 1. **Dãy số hoá đơn không được thủng lỗ.** Cơ quan thuế đọc dãy số liên tục;
 *    cấp số 5 rồi bỏ, sau đó cấp số 6, là phải giải trình. Nên số chỉ được cấp
 *    trong transaction đã khoá, và không có đường nào xoá hoá đơn.
 * 2. **Tiền là `Int` đồng.** VAT tách từ tổng *đã gồm thuế* bằng `splitVat`, thứ
 *    bảo đảm `net + vat === gross` tuyệt đối. Tính riêng rồi cộng lại là có ngày
 *    lệch một đồng, và một đồng lệch trên hoá đơn là hoá đơn phải huỷ.
 */

/** Mã người bán, phần đuôi của ký hiệu hoá đơn. */
const MA_NGUOI_BAN = "TMS";

/**
 * Thuế suất **không** còn là hằng số: cửa hàng đặt ở `/admin/cai-dat`. Hằng số
 * này chỉ còn là giá trị dự phòng cho chỗ hiển thị khi chưa đọc được cài đặt.
 */
export const VAT_RATE_MAC_DINH = 8;

/**
 * `1C26TMS` như mockup: `1` hoá đơn GTGT, `C` có mã của cơ quan thuế, `26` hai
 * chữ số cuối của năm phát hành, `TMS` mã người bán. Năm nằm trong ký hiệu nên
 * mỗi năm dãy số đánh lại từ 1 — đó là lý do `number` chỉ duy nhất trong một
 * ký hiệu chứ không duy nhất toàn bảng.
 */
export function invoiceSymbol(at: Date): string {
  return `1C${String(at.getFullYear()).slice(-2)}${MA_NGUOI_BAN}`;
}

export class OrderNotFoundError extends Error {
  constructor(code: string) {
    super(`Không tìm thấy đơn ${code}.`);
    this.name = "OrderNotFoundError";
  }
}

export class CancelledOrderError extends Error {
  constructor(code: string) {
    super(`Đơn ${code} đã huỷ nên không phát hành hoá đơn được.`);
    this.name = "CancelledOrderError";
  }
}

const INVOICE_VIEW = {
  id: true,
  symbol: true,
  number: true,
  buyerName: true,
  buyerTax: true,
  buyerAddr: true,
  vatRate: true,
  netAmount: true,
  vatAmount: true,
  grossAmount: true,
  issuedAt: true,
  issuedBy: { select: { name: true } },
} satisfies Prisma.InvoiceSelect;

/**
 * Phát hành hoá đơn cho một đơn. Gọi lại lần hai trả về đúng hoá đơn cũ chứ
 * không cấp thêm số — kế toán bấm hai lần, hoặc bấm rồi tải lại trang, không
 * được làm thủng dãy số.
 */
export async function issueInvoice(orderCode: string, actorId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { code: orderCode },
      select: {
        id: true,
        code: true,
        status: true,
        total: true,
        receiver: true,
        province: true,
        district: true,
        ward: true,
        street: true,
        vatBuyerName: true,
        vatTaxCode: true,
        vatAddress: true,
        invoice: { select: INVOICE_VIEW },
      },
    });
    if (!order) throw new OrderNotFoundError(orderCode);
    if (order.invoice) return order.invoice;
    if (order.status === "CANCELLED") throw new CancelledOrderError(orderCode);

    const symbol = invoiceSymbol(new Date());

    /*
     * Khoá theo ký hiệu, tự nhả khi transaction kết thúc. Chỉ `SELECT max` rồi
     * `+1` là không đủ: hai kế toán bấm cùng lúc sẽ cùng đọc ra số cũ, một
     * người đâm vào ràng buộc `@@unique` và mất luôn số vừa định cấp — đúng cái
     * lỗ hổng trong dãy số mà mình đang tránh.
     */
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${symbol}))`;

    const last = await tx.invoice.findFirst({
      where: { symbol },
      // Số đệm 0 cho đủ 8 ký tự nên so sánh chuỗi ra đúng thứ tự số học.
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const number = String(Number(last?.number ?? 0) + 1).padStart(8, "0");

    const { vatRate } = await getSettings();
    const tien = splitVat(order.total, vatRate);

    return tx.invoice.create({
      data: {
        orderId: order.id,
        symbol,
        number,
        // Khách không khai thông tin công ty thì xuất cho cá nhân người nhận.
        buyerName: order.vatBuyerName?.trim() || order.receiver,
        buyerTax: order.vatTaxCode?.trim() || null,
        buyerAddr:
          order.vatAddress?.trim() ||
          [order.street, order.ward, order.district, order.province].join(", "),
        vatRate,
        netAmount: tien.net,
        vatAmount: tien.vat,
        grossAmount: tien.gross,
        issuedById: actorId,
      },
      select: INVOICE_VIEW,
    });
  });
}

/** Hoá đơn kèm đủ dữ liệu để dựng bản in A4 và bản 80mm. */
export async function getInvoice(symbol: string, number: string) {
  return db.invoice.findUnique({
    where: { symbol_number: { symbol, number } },
    select: {
      ...INVOICE_VIEW,
      order: {
        select: {
          code: true,
          receiver: true,
          phone: true,
          email: true,
          paymentMethod: true,
          carrier: true,
          subtotal: true,
          discount: true,
          shippingFee: true,
          total: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              sku: true,
              productName: true,
              color: true,
              size: true,
              qty: true,
              unitPrice: true,
              lineTotal: true,
            },
          },
        },
      },
    },
  });
}

export type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

/** Danh sách cho `DataTable`, tìm theo số hoá đơn / mã đơn / tên người mua. */
export async function listInvoices(query: TableQuery) {
  const q = query.q.trim();
  const where: Prisma.InvoiceWhereInput = q
    ? {
        OR: [
          { number: { contains: q, mode: "insensitive" } },
          { buyerName: { contains: q, mode: "insensitive" } },
          { buyerTax: { contains: q, mode: "insensitive" } },
          { order: { code: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy: { issuedAt: query.chieu },
      skip: (query.trang - 1) * TABLE_PAGE_SIZE,
      take: TABLE_PAGE_SIZE,
      select: { ...INVOICE_VIEW, order: { select: { code: true } } },
    }),
    db.invoice.count({ where }),
  ]);

  return { rows, total };
}

export type InvoiceRow = Awaited<ReturnType<typeof listInvoices>>["rows"][number];
