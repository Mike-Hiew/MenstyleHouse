import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@prisma/client";
import { db } from "../src/lib/db";
import { moveStock } from "../src/lib/inventory";
import { nextCode } from "../src/lib/codes";
import {
  advanceOrderStatus,
  InvalidTransitionError,
  MissingTrackingError,
  NEXT_STATUS,
  setShipping,
} from "../src/server/admin/orders";
import { isStaff, STAFF_ROLES } from "../src/server/admin/guard";

/**
 * Máy trạng thái đơn là chỗ nhân viên bấm hàng ngày. Nhảy cóc sai một bước là
 * đơn chưa đóng gói đã báo đang giao, hoặc đơn đã huỷ vẫn trừ tồn.
 */

async function seedOrder(qty = 1) {
  const variant = await db.variant.findFirstOrThrow({
    where: { stock: { gte: 5 } },
    include: { product: true },
  });
  const unitPrice = (variant.product.salePrice ?? variant.product.basePrice) + variant.priceDelta;

  return db.$transaction(async (tx) => {
    const code = await nextCode(tx, "MSH");
    const order = await tx.order.create({
      data: {
        code,
        isGuest: true,
        receiver: "Test Admin",
        phone: "0900000007",
        province: "TP. Hồ Chí Minh",
        district: "Q1",
        ward: "P1",
        street: "1 Test",
        status: "PENDING",
        paymentStatus: "UNPAID",
        paymentMethod: "COD",
        carrier: "GHN",
        subtotal: unitPrice * qty,
        shippingFee: 0,
        total: unitPrice * qty,
        items: {
          create: {
            variantId: variant.id,
            sku: variant.sku,
            productName: variant.product.name,
            color: variant.color,
            size: variant.size,
            unitPrice,
            qty,
            lineTotal: unitPrice * qty,
          },
        },
      },
      select: { id: true, code: true },
    });

    await moveStock(tx, {
      variantId: variant.id,
      delta: -qty,
      type: "SALE",
      refType: "Order",
      refId: order.id,
    });

    return { ...order, variantId: variant.id, qty };
  });
}

async function ledgerDrift() {
  const rows = await db.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::bigint AS n FROM (
      SELECT v.id FROM "Variant" v
      LEFT JOIN "InventoryMovement" m ON m."variantId" = v.id
      GROUP BY v.id, v.stock HAVING v.stock <> COALESCE(SUM(m.delta), 0)
    ) t`;
  return Number(rows[0].n);
}

describe("máy trạng thái đơn", () => {
  it("đi hết PENDING → DELIVERED và ghi đủ sự kiện", async () => {
    const o = await seedOrder();
    const path: OrderStatus[] = ["CONFIRMED", "PACKING", "SHIPPING", "DELIVERED"];

    for (const to of path) {
      // Quy trình thật: bàn giao cho hãng vận chuyển rồi mới bấm "Đang giao".
      if (to === "SHIPPING") {
        await setShipping(o.code, {
          carrier: "GHN",
          trackingCode: "GHN" + o.code,
          actorName: "Trần Thu",
        });
      }
      await advanceOrderStatus(o.code, to, "Trần Thu");
    }

    const after = await db.order.findUniqueOrThrow({
      where: { code: o.code },
      include: { events: true },
    });

    expect(after.status).toBe("DELIVERED");
    // Giao xong cho đơn COD nghĩa là đã thu tiền.
    expect(after.paymentStatus).toBe("PAID");
    /*
     * Đếm riêng dòng *chuyển trạng thái*. Dòng cập nhật vận chuyển cũng mang
     * trạng thái hiện tại của đơn, nên lọc theo `status` không thôi sẽ tính cả
     * nó vào — bốn bước chuyển hoá ra năm dòng.
     */
    const chuyenTrangThai = after.events.filter(
      (e) => path.includes(e.status) && !e.note?.startsWith("Cập nhật vận chuyển"),
    );
    expect(chuyenTrangThai).toHaveLength(4);
    expect(after.events.some((e) => e.note?.startsWith("Cập nhật vận chuyển"))).toBe(true);
    expect(await ledgerDrift()).toBe(0);
  });

  it("không cho nhảy cóc PENDING → SHIPPING", async () => {
    const o = await seedOrder();
    await expect(advanceOrderStatus(o.code, "SHIPPING", "Trần Thu")).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
    const after = await db.order.findUniqueOrThrow({ where: { code: o.code } });
    expect(after.status).toBe("PENDING");
  });

  it("huỷ từ admin vẫn hoàn tồn đúng", async () => {
    const o = await seedOrder(2);
    const before = (await db.variant.findUniqueOrThrow({ where: { id: o.variantId } })).stock;

    await advanceOrderStatus(o.code, "CANCELLED", "Trần Thu");

    const after = (await db.variant.findUniqueOrThrow({ where: { id: o.variantId } })).stock;
    expect(after).toBe(before + o.qty);
    expect(await ledgerDrift()).toBe(0);
  });

  it("đơn đã huỷ là trạng thái cuối, không đi tiếp được", async () => {
    const o = await seedOrder();
    await advanceOrderStatus(o.code, "CANCELLED", "Trần Thu");
    expect(NEXT_STATUS.CANCELLED).toEqual([]);
    await expect(advanceOrderStatus(o.code, "CONFIRMED", "Trần Thu")).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
  });
});

describe("phân quyền admin", () => {
  it("khách hàng thường không phải nhân viên", () => {
    expect(isStaff("CUSTOMER")).toBe(false);
    expect(isStaff(null)).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });

  it("mọi vai trò nhân viên đều vào được khu quản trị", () => {
    for (const r of STAFF_ROLES) expect(isStaff(r)).toBe(true);
  });
});

/**
 * Giao hàng nhập tay — thay cho việc nối API hãng vận chuyển (M7).
 *
 * Luật đáng canh: đơn không được ở trạng thái "đang giao" mà không có gì để
 * khách tra. Đó là cách đẩy việc sang tổng đài: khách gọi hỏi hàng ở đâu và
 * không ai trả lời được.
 */
describe("vận chuyển nhập tay", () => {
  async function donDangDongGoi(carrier: "GHN" | "STORE_PICKUP" | null) {
    const o = await seedOrder();
    await advanceOrderStatus(o.code, "CONFIRMED", "Kiểm thử");
    await advanceOrderStatus(o.code, "PACKING", "Kiểm thử");
    if (carrier) {
      await setShipping(o.code, { carrier, trackingCode: null, actorName: "Kiểm thử" });
    }
    return o;
  }

  it("chặn chuyển sang Đang giao khi chưa có mã vận đơn", async () => {
    const o = await donDangDongGoi("GHN");
    await expect(advanceOrderStatus(o.code, "SHIPPING", "Kiểm thử")).rejects.toBeInstanceOf(
      MissingTrackingError,
    );
  });

  it("có mã rồi thì đi tiếp được, và mã hiện ra cho khách", async () => {
    const o = await donDangDongGoi("GHN");
    await setShipping(o.code, {
      carrier: "GHN",
      trackingCode: "GHN123456789",
      actorName: "Nhân viên A",
    });

    await advanceOrderStatus(o.code, "SHIPPING", "Kiểm thử");

    const sau = await db.order.findUniqueOrThrow({
      where: { code: o.code },
      select: { status: true, trackingCode: true },
    });
    expect(sau.status).toBe("SHIPPING");
    expect(sau.trackingCode).toBe("GHN123456789");
  });

  it("nhận tại cửa hàng được miễn — không có mã để tra", async () => {
    const o = await donDangDongGoi("STORE_PICKUP");
    await expect(advanceOrderStatus(o.code, "SHIPPING", "Kiểm thử")).resolves.toBeUndefined();
  });

  it("mỗi lần đổi vận chuyển để lại một dòng lịch sử", async () => {
    const o = await donDangDongGoi("GHN");
    const truoc = await db.orderEvent.count({ where: { order: { code: o.code } } });

    await setShipping(o.code, { carrier: "GHN", trackingCode: "GHN999", actorName: "Nhân viên B" });

    const sau = await db.orderEvent.findMany({
      where: { order: { code: o.code } },
      orderBy: { createdAt: "asc" },
    });
    expect(sau.length).toBe(truoc + 1);
    expect(sau.at(-1)?.note).toContain("GHN999");
    expect(sau.at(-1)?.actorName).toBe("Nhân viên B");
  });

  it("lưu lại đúng thứ đang có thì không ghi thêm dòng thừa", async () => {
    const o = await donDangDongGoi("GHN");
    await setShipping(o.code, { carrier: "GHN", trackingCode: "GHN777", actorName: "A" });
    const truoc = await db.orderEvent.count({ where: { order: { code: o.code } } });

    await setShipping(o.code, { carrier: "GHN", trackingCode: "GHN777", actorName: "A" });

    expect(await db.orderEvent.count({ where: { order: { code: o.code } } })).toBe(truoc);
  });
});
