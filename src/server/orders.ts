import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { moveStock } from "@/lib/inventory";
import { nextCode } from "@/lib/codes";
import { findQuote } from "@/lib/shipping";
import { getSettings } from "@/server/settings";
import { pointsFor } from "@/lib/money";
import { getOrCreateCart, clearCart, readCartCoupon } from "./cart";
import { consumeCoupon } from "./coupons";

/**
 * Đặt đơn COD. Toàn bộ nằm trong một transaction: kiểm + trừ tồn qua
 * `moveStock` (điểm vào duy nhất, luôn sinh `InventoryMovement`), tạo `Order`
 * với **snapshot** giá/tên/địa chỉ, rồi tạo `Payment`.
 */

export const checkoutSchema = z.object({
  receiver: z.string().trim().min(2, "Nhập tên người nhận").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{9}$/, "Số điện thoại phải có 10 số và bắt đầu bằng 0"),
  email: z.union([z.string().trim().email("Email không hợp lệ"), z.literal("")]).optional(),
  province: z.string().trim().min(1, "Chọn tỉnh/thành phố"),
  district: z.string().trim().min(1, "Chọn quận/huyện"),
  ward: z.string().trim().min(1, "Chọn phường/xã"),
  street: z.string().trim().min(4, "Nhập địa chỉ cụ thể").max(200),
  note: z.string().trim().max(300).optional(),
  carrier: z.enum(["GHN", "GHTK", "VIETTEL_POST"]),
  /**
   * Chỉ hai phương thức tự chạy trọn vẹn. Ví điện tử **cố ý không** nằm trong
   * enum: chặn ở đây thì dù ai gọi thẳng API với `paymentMethod: "VNPAY"` cũng
   * không tạo được đơn treo mà không có đường thanh toán nào.
   */
  paymentMethod: z.enum(["COD", "BANK_TRANSFER"]),

  /* Xuất hoá đơn công ty — khách khai lúc đặt, kế toán phát hành sau. */
  vatRequested: z.coerce.boolean().optional(),
  vatBuyerName: z.string().trim().max(160).optional(),
  vatTaxCode: z
    .union([z.string().trim().regex(/^\d{10}(-\d{3})?$/, "MST gồm 10 số, chi nhánh thêm -xxx"), z.literal("")])
    .optional(),
  vatAddress: z.string().trim().max(200).optional(),
  vatEmail: z.union([z.string().trim().email("Email nhận hoá đơn không hợp lệ"), z.literal("")]).optional(),
  /** Gọi lại cùng key trả về đúng đơn cũ — `docs/API.md`. */
  idempotencyKey: z.string().trim().min(8).max(64),
}).superRefine((v, ctx) => {
  // Tick ô xuất hoá đơn thì ba trường kia thành bắt buộc. Kiểm ở server chứ
  // không chỉ ẩn/hiện ở UI: hoá đơn thiếu MST là hoá đơn phải huỷ và lập lại.
  if (!v.vatRequested) return;
  const buoc: [keyof typeof v, string][] = [
    ["vatBuyerName", "Nhập tên công ty xuất hoá đơn"],
    ["vatTaxCode", "Nhập mã số thuế"],
    ["vatAddress", "Nhập địa chỉ trên hoá đơn"],
  ];
  for (const [field, message] of buoc) {
    if (!String(v[field] ?? "").trim()) {
      ctx.addIssue({ code: "custom", path: [field], message });
    }
  }
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export class CartEmptyError extends Error {
  constructor() {
    super("Giỏ hàng đang trống.");
    this.name = "CartEmptyError";
  }
}

export class OutOfStockError extends Error {
  constructor(public sku: string, public available: number) {
    super("Sản phẩm " + sku + " chỉ còn " + available + " cái.");
    this.name = "OutOfStockError";
  }
}

export async function placeOrder(input: CheckoutInput): Promise<{ code: string }> {
  // Idempotency: đơn cũ mang cùng key thì trả lại luôn, không đặt trùng.
  const seen = await db.order.findFirst({
    where: { note: { contains: idemTag(input.idempotencyKey) } },
    select: { code: true },
  });
  if (seen) return { code: seen.code };

  const cart = await getOrCreateCart();
  if (cart.items.length === 0) throw new CartEmptyError();

  // Member đặt đơn thì gắn userId để tích điểm khi đơn hoàn tất.
  // Nạp động: tầng đơn hàng không nên phụ thuộc cứng vào Auth.js, nhờ vậy
  // test gọi thẳng `cancelOrder` mà không phải kéo cả next-auth vào.
  const { currentUserId } = await import("@/auth");
  const userId = await currentUserId();

  const lines = cart.items.map((it) => {
    const unitPrice = (it.variant.product.salePrice ?? it.variant.product.basePrice) + it.variant.priceDelta;
    return {
      variantId: it.variantId,
      sku: it.variant.sku,
      productName: it.variant.product.name,
      color: it.variant.color,
      size: it.variant.size,
      imageUrl: it.variant.product.images[0]?.url ?? null,
      unitPrice,
      qty: it.qty,
      lineTotal: unitPrice * it.qty,
      stock: it.variant.stock,
    };
  });

  const short = lines.find((l) => l.qty > l.stock);
  if (short) throw new OutOfStockError(short.sku, short.stock);

  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);

  // Tiền giảm **tính lại ở server** từ mã gắn trên giỏ; không tin số client gửi.
  const applied = await readCartCoupon();
  const discount = applied?.discount ?? 0;

  const caiDat = await getSettings();
  const quote = findQuote(input.province, subtotal, input.carrier, caiDat);
  const shippingFee = quote?.fee ?? 0;
  const total = Math.max(0, subtotal - discount) + shippingFee;

  const code = await db.$transaction(async (tx) => {
    const orderCode = await nextCode(tx, "MSH");

    const order = await tx.order.create({
      data: {
        code: orderCode,
        userId,
        isGuest: userId === null,
        receiver: input.receiver,
        phone: input.phone,
        email: input.email || null,
        province: input.province,
        district: input.district,
        ward: input.ward,
        street: input.street,
        note: [input.note, idemTag(input.idempotencyKey)].filter(Boolean).join(" "),
        status: "PENDING",
        paymentStatus: "UNPAID",
        paymentMethod: input.paymentMethod,
        carrier: input.carrier,
        subtotal,
        discount,
        couponCode: applied?.code ?? null,
        shippingFee,
        total,
        vatRequested: Boolean(input.vatRequested),
        vatBuyerName: input.vatRequested ? (input.vatBuyerName ?? null) : null,
        vatTaxCode: input.vatRequested ? (input.vatTaxCode || null) : null,
        vatAddress: input.vatRequested ? (input.vatAddress ?? null) : null,
        vatEmail: input.vatRequested ? (input.vatEmail || null) : null,
        // Điểm chỉ ghi nhận khi đơn PAID *và* DELIVERED — đây mới là dự kiến.
        pointsEarned: 0,
        pointsUsed: 0,
        items: {
          create: lines.map((l) => ({
            variantId: l.variantId,
            sku: l.sku,
            productName: l.productName,
            color: l.color,
            size: l.size,
            imageUrl: l.imageUrl,
            unitPrice: l.unitPrice,
            qty: l.qty,
            lineTotal: l.lineTotal,
          })),
        },
        events: {
          create: { status: "PENDING", note: "Khách đặt đơn trên website", actorName: input.receiver },
        },
      },
      select: { id: true, code: true },
    });

    // Trừ tồn qua điểm vào duy nhất; hết hàng thì cả transaction rollback.
    for (const l of lines) {
      await moveStock(tx, {
        variantId: l.variantId,
        delta: -l.qty,
        type: "SALE",
        refType: "Order",
        refId: order.id,
        note: "Đặt đơn " + order.code,
        actorName: input.receiver,
      });
    }

    if (applied) await consumeCoupon(tx, applied.code);

    await tx.payment.create({
      data: {
        orderId: order.id,
        method: input.paymentMethod,
        amount: total,
        status: "UNPAID",
      },
    });

    return order.code;
  });

  await clearCart(cart.id);
  return { code };
}

/** Nhãn nhét vào `note` để nhận ra lần gọi trùng — schema chưa có cột riêng. */
function idemTag(key: string) {
  return "[idem:" + key + "]";
}

/* ── Tra cứu đơn ──────────────────────────────────────────── */

const orderInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: true,
  events: { orderBy: { createdAt: "asc" } },
});

export type OrderDetail = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/** Mã đơn + 4 số cuối SĐT — không cho dò đơn người khác bằng mỗi mã. */
export async function findOrderForLookup(
  code: string,
  phoneTail: string,
): Promise<OrderDetail | null> {
  const order = await db.order.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: orderInclude,
  });
  if (!order) return null;
  return order.phone.slice(-4) === phoneTail.trim() ? order : null;
}

export async function getOrderByCode(code: string): Promise<OrderDetail | null> {
  return db.order.findUnique({ where: { code }, include: orderInclude });
}

/** Điểm dự kiến nhận được khi đơn hoàn tất — hiện ở trang cảm ơn. */
export function expectedPoints(total: number): number {
  return pointsFor(total);
}

/** Đơn của một thành viên, mới nhất trước. */
export async function listOrdersForUser(userId: string) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, code: true, status: true, total: true, phone: true, createdAt: true },
    take: 50,
  });
}

/* ── Huỷ đơn ──────────────────────────────────────────────── */

export class CannotCancelError extends Error {
  constructor(status: string) {
    super("Đơn đang ở trạng thái " + status + " nên không huỷ được. Bạn gọi 1900 6060 giúp.");
    this.name = "CannotCancelError";
  }
}

/** Chỉ huỷ được khi chưa rời kho. `docs/API.md`: PENDING hoặc CONFIRMED. */
const CANCELLABLE = ["PENDING", "CONFIRMED"];

/**
 * Huỷ đơn: hoàn tồn qua `moveStock` (vẫn là điểm vào duy nhất) và hoàn điểm đã
 * ghi, tất cả trong một transaction. Huỷ hai lần không trừ/cộng trùng vì lần
 * sau trạng thái đã là CANCELLED.
 */
export async function cancelOrder(
  code: string,
  actorName = "Khách",
  reason = "Khách huỷ đơn",
): Promise<void> {
  const order = await db.order.findUnique({
    where: { code },
    include: { items: true },
  });
  if (!order) throw new Error("Không tìm thấy đơn " + code);
  if (!CANCELLABLE.includes(order.status)) throw new CannotCancelError(order.status);

  await db.$transaction(async (tx) => {
    for (const it of order.items) {
      await moveStock(tx, {
        variantId: it.variantId,
        delta: it.qty,
        type: "CANCEL",
        refType: "Order",
        refId: order.id,
        note: "Huỷ đơn " + order.code,
        actorName,
      });
    }

    // Trả lại lượt dùng mã giảm giá cho khách khác.
    if (order.couponCode) {
      await tx.coupon.updateMany({
        where: { code: order.couponCode },
        data: { usedCount: { decrement: 1 } },
      });
    }

    // Hoàn điểm đã ghi, nếu đơn từng được tích.
    if (order.userId && order.pointsEarned > 0) {
      await tx.pointEntry.create({
        data: {
          userId: order.userId,
          delta: -order.pointsEarned,
          reason: "REFUND",
          orderId: order.id,
          note: "Huỷ đơn " + order.code,
        },
      });
      await tx.user.update({
        where: { id: order.userId },
        data: { pointBalance: { decrement: order.pointsEarned } },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", pointsEarned: 0 },
    });

    await tx.orderEvent.create({
      data: { orderId: order.id, status: "CANCELLED", note: reason, actorName },
    });
  });
}
