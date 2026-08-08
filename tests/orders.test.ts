import { describe, expect, it } from "vitest";
import { db } from "../src/lib/db";
import { moveStock } from "../src/lib/inventory";
import { nextCode } from "../src/lib/codes";
import { cancelOrder, CannotCancelError } from "../src/server/orders";
import { awardPointsForOrder } from "../src/server/accounts";
import { rateLimit } from "../src/server/rate-limit";

/**
 * Huỷ đơn là chỗ dễ làm hỏng sổ tồn kho nhất: hoàn sai thì bất biến
 * `stock === Σ(movements.delta)` gãy ngay. Test dựng một đơn thật rồi huỷ.
 */

async function seedOrder(opts: { userId?: string; qty?: number } = {}) {
  const variant = await db.variant.findFirstOrThrow({
    where: { stock: { gte: 5 } },
    include: { product: true },
  });
  const qty = opts.qty ?? 2;
  const unitPrice = (variant.product.salePrice ?? variant.product.basePrice) + variant.priceDelta;

  return db.$transaction(async (tx) => {
    const code = await nextCode(tx, "MSH");
    const order = await tx.order.create({
      data: {
        code,
        userId: opts.userId ?? null,
        isGuest: !opts.userId,
        receiver: "Test",
        phone: "0900000009",
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

describe("huỷ đơn", () => {
  it("hoàn đúng số tồn đã trừ và giữ nguyên bất biến sổ", async () => {
    const o = await seedOrder({ qty: 2 });
    const before = (await db.variant.findUniqueOrThrow({ where: { id: o.variantId } })).stock;

    await cancelOrder(o.code);

    const after = (await db.variant.findUniqueOrThrow({ where: { id: o.variantId } })).stock;
    expect(after).toBe(before + o.qty);
    expect(await ledgerDrift()).toBe(0);

    const order = await db.order.findUniqueOrThrow({ where: { code: o.code } });
    expect(order.status).toBe("CANCELLED");
  });

  it("không huỷ được đơn đã giao", async () => {
    const o = await seedOrder({ qty: 1 });
    await db.order.update({ where: { code: o.code }, data: { status: "DELIVERED" } });
    await expect(cancelOrder(o.code)).rejects.toBeInstanceOf(CannotCancelError);
  });

  it("huỷ đơn đã tích điểm thì hoàn lại đúng số điểm", async () => {
    const user = await db.user.create({
      data: { name: "Test Điểm", phone: "09" + String(Date.now()).slice(-8), pointBalance: 0 },
    });
    const o = await seedOrder({ userId: user.id, qty: 1 });

    await db.order.update({
      where: { code: o.code },
      data: { status: "DELIVERED", paymentStatus: "PAID" },
    });
    const earned = await awardPointsForOrder(o.code);
    expect(earned).toBeGreaterThan(0);

    // Đưa về trạng thái huỷ được rồi huỷ.
    await db.order.update({ where: { code: o.code }, data: { status: "CONFIRMED" } });
    await cancelOrder(o.code);

    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.pointBalance).toBe(0);
    expect(await ledgerDrift()).toBe(0);
  });
});

describe("giới hạn tần suất", () => {
  it("cho qua đúng số lượt rồi chặn", () => {
    const key = "test:" + Math.random();
    const results = Array.from({ length: 12 }, () => rateLimit(key, 10, 60_000).ok);
    expect(results.filter(Boolean).length).toBe(10);
    expect(results.slice(10)).toEqual([false, false]);
  });

  it("hết cửa sổ thì mở lại", async () => {
    const key = "test:" + Math.random();
    // Cửa sổ 60ms: đủ dài để hai lượt đầu chắc chắn nằm trong cùng chu kỳ,
    // đủ ngắn để test không chậm. Cửa sổ 1ms làm test chập chờn.
    expect(rateLimit(key, 1, 60).ok).toBe(true);
    expect(rateLimit(key, 1, 60).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 90));
    expect(rateLimit(key, 1, 60).ok).toBe(true);
  });
});
