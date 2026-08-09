import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { moveStock } from "@/lib/inventory";
import { tinhGiamTheoDiem } from "@/lib/points";
import { nextCode } from "@/lib/codes";
import { findQuote } from "@/lib/shipping";
import { getSettings } from "@/server/settings";

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
  /** Số điểm khách xin dùng; server tự cắt về mức cho phép. */
  pointsToUse: z.coerce.number().int().min(0).max(10_000_000).optional(),
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

  /*
   * Điểm **tính lại ở server** từ số dư thật, y như tiền giảm của mã. Số client
   * gửi lên chỉ là ý muốn; tin nó là mở đường lấy hàng bằng điểm không có.
   *
   * Chỉ member mới có điểm, và điểm trừ vào **tiền hàng sau giảm giá**, không
   * trừ vào phí ship.
   */
  const tienHang = Math.max(0, subtotal - discount);
  const soDiem = userId
    ? ((await db.user.findUnique({ where: { id: userId }, select: { pointBalance: true } }))
        ?.pointBalance ?? 0)
    : 0;
  const { diemDung, tienGiam: giamTheoDiem } = tinhGiamTheoDiem({
    xinDung: input.pointsToUse ?? 0,
    soDiem,
    tienHang,
    luat: caiDat,
  });

  const total = Math.max(0, tienHang - giamTheoDiem) + shippingFee;

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
        pointsUsed: diemDung,
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

    /*
     * Trừ điểm **ngay khi đặt**, không đợi giao xong: khách đã được giảm tiền
     * rồi. Đơn huỷ hay trả hàng thì `cancelOrder`/`returnOrder` trả lại đủ.
     */
    if (userId && diemDung > 0) {
      await tx.pointEntry.create({
        data: {
          userId,
          delta: -diemDung,
          reason: "REDEEM_ORDER",
          orderId: order.id,
          note: "Dùng cho đơn " + order.code,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { pointBalance: { decrement: diemDung } },
      });
    }

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

    /*
     * Trả lại điểm khách đã **tiêu** vào đơn. Không trả là khách mất trắng
     * điểm cho một đơn không bao giờ tới — và họ đếm từng điểm.
     */
    if (order.userId && order.pointsUsed > 0) {
      await tx.pointEntry.create({
        data: {
          userId: order.userId,
          delta: order.pointsUsed,
          reason: "REFUND",
          orderId: order.id,
          note: "Hoàn điểm đã dùng cho đơn huỷ " + order.code,
        },
      });
      await tx.user.update({
        where: { id: order.userId },
        data: { pointBalance: { increment: order.pointsUsed } },
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

export class CannotReturnError extends Error {
  constructor(status: string) {
    super(`Đơn đang ở trạng thái "${status}" nên không ghi nhận trả hàng được.`);
    this.name = "CannotReturnError";
  }
}

/** Chỉ đơn đã rời kho mới có gì để trả lại. */
const RETURNABLE = ["SHIPPING", "DELIVERED"];

/**
 * Ghi nhận khách trả hàng.
 *
 * Trước M6.16, chuyển sang "Đã trả hàng" **chỉ đổi mỗi chữ trên màn hình**:
 * `MovementType.RETURN` có trong schema nhưng chưa bao giờ được dùng. Hàng thật
 * đã nằm lại trong kho mà hệ thống vẫn coi là đã bán, nên cửa hàng không bán
 * lại được chính số hàng đang cầm trong tay — và không có gì đỏ để ai kịp nhận
 * ra, vì bất biến `stock === Σ(movements.delta)` vẫn đúng.
 *
 * Bốn việc phải làm cùng lúc, trong một transaction:
 *   1. hàng về kho qua `moveStock` (điểm vào duy nhất, luôn sinh dòng sổ);
 *   2. thu hồi điểm đã cộng khi đơn giao xong;
 *   3. trả lại điểm khách đã tiêu vào đơn;
 *   4. đánh dấu đã hoàn tiền.
 *
 * **Không** trả lại lượt dùng mã giảm giá: khách đã mua thật rồi mới trả, khác
 * hẳn đơn huỷ trước khi giao. Trả lượt là mở đường lấy mã dùng vô hạn bằng cách
 * mua rồi trả.
 */
export async function returnOrder(
  code: string,
  actorName = "Nhân viên",
  reason = "Khách trả hàng",
): Promise<void> {
  const order = await db.order.findUnique({ where: { code }, include: { items: true } });
  if (!order) throw new Error("Không tìm thấy đơn " + code);
  if (!RETURNABLE.includes(order.status)) throw new CannotReturnError(order.status);

  await db.$transaction(async (tx) => {
    for (const it of order.items) {
      await moveStock(tx, {
        variantId: it.variantId,
        delta: it.qty,
        type: "RETURN",
        refType: "Order",
        refId: order.id,
        note: "Trả hàng đơn " + order.code,
        actorName,
      });
    }

    if (order.userId && order.pointsEarned > 0) {
      await tx.pointEntry.create({
        data: {
          userId: order.userId,
          delta: -order.pointsEarned,
          reason: "REFUND",
          orderId: order.id,
          note: "Trả hàng đơn " + order.code,
        },
      });
      await tx.user.update({
        where: { id: order.userId },
        data: { pointBalance: { decrement: order.pointsEarned } },
      });
    }

    if (order.userId && order.pointsUsed > 0) {
      await tx.pointEntry.create({
        data: {
          userId: order.userId,
          delta: order.pointsUsed,
          reason: "REFUND",
          orderId: order.id,
          note: "Hoàn điểm đã dùng cho đơn trả " + order.code,
        },
      });
      await tx.user.update({
        where: { id: order.userId },
        data: { pointBalance: { increment: order.pointsUsed } },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "RETURNED",
        pointsEarned: 0,
        // Đơn đã thu tiền thì trả hàng là phải hoàn; đơn chưa thu thì thôi.
        ...(order.paymentStatus === "PAID" ? { paymentStatus: "REFUNDED" as const } : {}),
      },
    });

    if (order.paymentStatus === "PAID") {
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PAID" },
        data: { status: "REFUNDED" },
      });
    }

    await tx.orderEvent.create({
      data: { orderId: order.id, status: "RETURNED", note: reason, actorName },
    });
  });
}
