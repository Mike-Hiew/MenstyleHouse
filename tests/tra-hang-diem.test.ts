import { afterEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { docKhoang } from "../src/lib/ky-bao-cao";

/** Khoảng mặc định 12 tháng — đúng khoảng các bài kiểm này vốn giả định. */
const KY12 = docKhoang({});
import {
  moveStock,
  chuyenKho,
  InsufficientStockError,
  SameWarehouseError,
} from "../src/lib/inventory";
import { returnOrder, cancelOrder, CannotReturnError } from "../src/server/orders";
import { diemToiDa, tinhGiamTheoDiem } from "../src/lib/points";
import { laiGop } from "../src/server/admin/reports";
import { vieccanLam } from "../src/server/admin/alerts";

/**
 * Trả hàng, dùng điểm, lãi gộp — M6.16.
 *
 * Bài nặng nhất là **trả hàng hoàn tồn kho**. Lỗi cũ không làm gì đỏ cả: bất
 * biến `stock === Σ(movements.delta)` vẫn đúng (vì không sinh dòng nào), đơn
 * vẫn đổi trạng thái, báo cáo vẫn loại RETURNED khỏi doanh thu. Chỉ có kho thật
 * là lệch — cửa hàng cầm hàng trong tay mà hệ thống bảo đã bán.
 */

const rac = { users: [] as string[], products: [] as string[], orders: [] as string[] };

afterEach(async () => {
  await db.orderItem.deleteMany({ where: { orderId: { in: rac.orders } } });
  await db.orderEvent.deleteMany({ where: { orderId: { in: rac.orders } } });
  await db.payment.deleteMany({ where: { orderId: { in: rac.orders } } });
  await db.pointEntry.deleteMany({ where: { orderId: { in: rac.orders } } });
  await db.order.deleteMany({ where: { id: { in: rac.orders } } });
  const bt = await db.variant.findMany({
    where: { productId: { in: rac.products } },
    select: { id: true },
  });
  await db.inventoryMovement.deleteMany({ where: { variantId: { in: bt.map((v) => v.id) } } });
  await db.variant.deleteMany({ where: { productId: { in: rac.products } } });
  await db.product.deleteMany({ where: { id: { in: rac.products } } });
  await db.pointEntry.deleteMany({ where: { userId: { in: rac.users } } });
  await db.user.deleteMany({ where: { id: { in: rac.users } } });
  for (const k of Object.values(rac)) k.length = 0;
});

let dem = 0;

async function bienThe(ton = 10) {
  dem += 1;
  const cat = await db.category.findFirstOrThrow({ select: { id: true } });
  const p = await db.product.create({
    data: {
      name: "Áo kiểm thử trả hàng " + dem,
      slug: `ao-tra-hang-${dem}-${Date.now()}`,
      code: `TH${Date.now()}${dem}`.slice(-8),
      description: "Dựng để kiểm thử.",
      categoryId: cat.id,
      basePrice: 200_000,
      status: "ACTIVE",
      variants: { create: { sku: `TH-${Date.now()}-${dem}`, color: "Đen", colorHex: "#000", size: "L" } },
    },
    include: { variants: true },
  });
  rac.products.push(p.id);
  await moveStock(db, {
    variantId: p.variants[0].id,
    delta: ton,
    type: "RECEIPT",
    note: "Nhập cho kiểm thử",
    actorName: "kiểm thử",
  });
  return p.variants[0];
}

async function nguoiDung(diem = 0) {
  dem += 1;
  const u = await db.user.create({
    data: {
      name: "Khách trả hàng " + dem,
      phone: "0931" + String(100000 + dem).slice(-6),
      email: `th${dem}.${Date.now()}@vidu.vn`,
      passwordHash: await bcrypt.hash("matkhau123", 10),
      pointBalance: diem,
    },
  });
  rac.users.push(u.id);
  return u;
}

/** Một đơn đã giao, đã thu tiền, đã cộng điểm — cảnh trước khi khách trả hàng. */
async function donDaGiao(opts: { userId?: string; qty?: number; pointsEarned?: number; pointsUsed?: number } = {}) {
  dem += 1;
  const v = await bienThe(10);
  const qty = opts.qty ?? 2;

  const d = await db.order.create({
    data: {
      code: `TH-${Date.now()}-${dem}`,
      userId: opts.userId ?? null,
      isGuest: !opts.userId,
      receiver: "Khách",
      phone: "0900000000",
      province: "TP.HCM",
      district: "Quận 1",
      ward: "Bến Nghé",
      street: "1 Đường số 1",
      status: "DELIVERED",
      paymentStatus: "PAID",
      paymentMethod: "COD",
      subtotal: 200_000 * qty,
      shippingFee: 0,
      discount: 0,
      total: 200_000 * qty,
      pointsEarned: opts.pointsEarned ?? 0,
      pointsUsed: opts.pointsUsed ?? 0,
      items: {
        create: {
          variantId: v.id,
          sku: v.sku,
          productName: "Áo kiểm thử",
          color: "Đen",
          size: "L",
          unitPrice: 200_000,
          qty,
          lineTotal: 200_000 * qty,
        },
      },
      payments: { create: { method: "COD", amount: 200_000 * qty, status: "PAID" } },
    },
  });
  rac.orders.push(d.id);

  // Đơn đã giao nghĩa là hàng đã rời kho.
  await moveStock(db, {
    variantId: v.id,
    delta: -qty,
    type: "SALE",
    refType: "Order",
    refId: d.id,
    note: "Bán",
    actorName: "kiểm thử",
  });

  return { don: d, variant: v, qty };
}

describe("trả hàng", () => {
  it("HÀNG VỀ LẠI KHO và sổ có dòng RETURN", async () => {
    /*
     * Đây là lỗi cũ. Trước M6.16 chuyển sang "Đã trả hàng" chỉ đổi mỗi chữ:
     * `MovementType.RETURN` có trong schema mà chưa bao giờ được dùng.
     */
    const { don, variant, qty } = await donDaGiao();
    const truoc = (await db.variant.findUniqueOrThrow({ where: { id: variant.id } })).stock;

    await returnOrder(don.code, "Thủ kho");

    const sau = (await db.variant.findUniqueOrThrow({ where: { id: variant.id } })).stock;
    expect(sau).toBe(truoc + qty);

    const dong = await db.inventoryMovement.findMany({
      where: { variantId: variant.id, type: "RETURN" },
    });
    expect(dong).toHaveLength(1);
    expect(dong[0].delta).toBe(qty);
  });

  it("giữ đúng bất biến stock === Σ(movements.delta)", async () => {
    const { don, variant } = await donDaGiao();
    await returnOrder(don.code, "Thủ kho");

    const [v, gom] = await Promise.all([
      db.variant.findUniqueOrThrow({ where: { id: variant.id } }),
      db.inventoryMovement.aggregate({ where: { variantId: variant.id }, _sum: { delta: true } }),
    ]);
    expect(v.stock).toBe(gom._sum.delta ?? 0);
  });

  it("đánh dấu đã hoàn tiền cho đơn đã thu", async () => {
    const { don } = await donDaGiao();
    await returnOrder(don.code);

    const sau = await db.order.findUniqueOrThrow({ where: { id: don.id }, include: { payments: true } });
    expect(sau.status).toBe("RETURNED");
    expect(sau.paymentStatus).toBe("REFUNDED");
    expect(sau.payments.every((p) => p.status === "REFUNDED")).toBe(true);
  });

  it("thu hồi điểm đã cộng, và trả lại điểm đã tiêu", async () => {
    const u = await nguoiDung(500);
    const { don } = await donDaGiao({ userId: u.id, pointsEarned: 400, pointsUsed: 100 });

    await returnOrder(don.code);

    const sau = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    // 500 − 400 (thu hồi điểm thưởng) + 100 (trả lại điểm đã tiêu) = 200
    expect(sau.pointBalance).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: don.id } })).pointsEarned).toBe(0);
  });

  it("KHÔNG trả lại lượt dùng mã giảm giá", async () => {
    /*
     * Khác đơn huỷ: khách đã mua thật rồi mới trả. Trả lượt là mở đường dùng
     * một mã vô hạn bằng cách mua rồi trả.
     */
    const ma = await db.coupon.create({
      data: {
        code: "TH-KM-" + Date.now(),
        type: "PERCENT",
        value: 10,
        usedCount: 5,
        startsAt: new Date(Date.now() - 86_400_000),
        endsAt: new Date(Date.now() + 86_400_000),
      },
    });
    const { don } = await donDaGiao();
    await db.order.update({ where: { id: don.id }, data: { couponCode: ma.code } });

    await returnOrder(don.code);

    expect((await db.coupon.findUniqueOrThrow({ where: { id: ma.id } })).usedCount).toBe(5);
    await db.coupon.delete({ where: { id: ma.id } });
  });

  it("đơn chưa giao thì không ghi nhận trả hàng được", async () => {
    const { don } = await donDaGiao();
    await db.order.update({ where: { id: don.id }, data: { status: "PENDING" } });
    await expect(returnOrder(don.code)).rejects.toThrow(CannotReturnError);
  });

  it("huỷ đơn cũng trả lại điểm khách đã tiêu", async () => {
    const u = await nguoiDung(300);
    const { don } = await donDaGiao({ userId: u.id, pointsUsed: 150 });
    await db.order.update({ where: { id: don.id }, data: { status: "PENDING" } });

    await cancelOrder(don.code);

    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).pointBalance).toBe(450);
  });
});

describe("dùng điểm trừ vào tiền đơn", () => {
  const LUAT = { redeemEnabled: true, pointValue: 1, redeemMaxPct: 50 };

  it("trần theo phần trăm tiền hàng", async () => {
    // 1.000.000 ₫ hàng, trần 50% → nhiều nhất 500.000 điểm dù có 9 triệu điểm.
    expect(diemToiDa({ soDiem: 9_000_000, tienHang: 1_000_000, luat: LUAT })).toBe(500_000);
  });

  it("không dùng quá số điểm đang có", async () => {
    expect(diemToiDa({ soDiem: 120, tienHang: 1_000_000, luat: LUAT })).toBe(120);
  });

  it("tắt chương trình thì không dùng được điểm nào", async () => {
    expect(
      diemToiDa({ soDiem: 5000, tienHang: 1_000_000, luat: { ...LUAT, redeemEnabled: false } }),
    ).toBe(0);
  });

  it("xin quá thì CẮT về mức cho phép, không ném lỗi", async () => {
    /*
     * Khách để giỏ vài ngày rồi quay lại, điểm có thể đã đổi vì một đơn khác
     * vừa giao xong. Chặn cả đơn vì chuyện đó là phạt nhầm người.
     */
    const r = tinhGiamTheoDiem({ xinDung: 999_999, soDiem: 200, tienHang: 1_000_000, luat: LUAT });
    expect(r).toEqual({ diemDung: 200, tienGiam: 200 });
  });

  it("một điểm đổi nhiều đồng thì tiền giảm nhân lên", async () => {
    const r = tinhGiamTheoDiem({
      xinDung: 100,
      soDiem: 100,
      tienHang: 1_000_000,
      luat: { ...LUAT, pointValue: 500 },
    });
    expect(r).toEqual({ diemDung: 100, tienGiam: 50_000 });
  });

  it("trần tính trên tiền hàng nên tiền giảm không vượt quá trần", async () => {
    const r = tinhGiamTheoDiem({
      xinDung: 100_000,
      soDiem: 100_000,
      tienHang: 100_000,
      luat: { ...LUAT, pointValue: 10 },
    });
    // Trần 50% của 100.000 = 50.000 ₫ → 5.000 điểm.
    expect(r.tienGiam).toBeLessThanOrEqual(50_000);
    expect(r.diemDung).toBe(5_000);
  });

  it("giỏ rỗng hoặc không điểm thì bằng 0", async () => {
    expect(diemToiDa({ soDiem: 0, tienHang: 500_000, luat: LUAT })).toBe(0);
    expect(diemToiDa({ soDiem: 500, tienHang: 0, luat: LUAT })).toBe(0);
  });
});

describe("lãi gộp và việc cần làm", () => {
  it("lãi gộp = doanh thu − giá vốn, và đếm dòng thiếu giá vốn", async () => {
    const r = await laiGop(KY12);
    expect(r.laiGop).toBe(r.doanhThu - r.giaVon);
    expect(r.giaVon).toBeGreaterThanOrEqual(0);
    expect(r.thieuGiaVon).toBeGreaterThanOrEqual(0);
    if (r.doanhThu > 0) {
      expect(r.bienLai).toBe(Math.round(((r.doanhThu - r.giaVon) / r.doanhThu) * 1000) / 10);
    }
  });

  it("việc cần làm chỉ liệt kê mục có số > 0", async () => {
    // Bày một dòng ghi "0 đơn chờ xác nhận" là rác, không phải thông báo.
    const ds = await vieccanLam();
    expect(ds.every((v) => v.so > 0)).toBe(true);
    expect(ds.every((v) => v.href.startsWith("/admin/"))).toBe(true);
  });
});

describe("chuyển kho", () => {
  it("chuyển xong: kho đi giảm, kho đến tăng, TỔNG không đổi", async () => {
    const v = await bienThe(10);
    const kho = await db.warehouse.findMany({ orderBy: { name: "asc" }, take: 2, select: { id: true } });
    if (kho.length < 2) return;

    const chinh = await db.warehouse.findFirstOrThrow({ where: { isMain: true }, select: { id: true } });
    const khac = kho.find((k) => k.id !== chinh.id)!;
    const truoc = (await db.variant.findUniqueOrThrow({ where: { id: v.id } })).stock;

    await db.$transaction((tx) =>
      chuyenKho(tx, { variantId: v.id, tuKho: chinh.id, denKho: khac.id, soLuong: 4 }),
    );

    const sau = await db.variant.findUniqueOrThrow({ where: { id: v.id } });
    expect(sau.stock, "chuyển kho không làm đổi tổng tồn").toBe(truoc);

    const muc = await db.stockLevel.findMany({ where: { variantId: v.id } });
    const theo = new Map(muc.map((m) => [m.warehouseId, m.qty]));
    expect(theo.get(khac.id)).toBe(4);
    expect(theo.get(chinh.id)).toBe(truoc - 4);
    expect([...theo.values()].reduce((a, b) => a + b, 0)).toBe(truoc);
  });

  it("sinh ĐÚNG HAI dòng sổ TRANSFER, cộng lại bằng 0", async () => {
    // Một dòng duy nhất thì sổ của từng kho không đọc được hàng đi đâu về đâu.
    const v = await bienThe(10);
    const chinh = await db.warehouse.findFirstOrThrow({ where: { isMain: true }, select: { id: true } });
    const khac = await db.warehouse.findFirstOrThrow({ where: { isMain: false }, select: { id: true } });

    await db.$transaction((tx) =>
      chuyenKho(tx, { variantId: v.id, tuKho: chinh.id, denKho: khac.id, soLuong: 3 }),
    );

    const dong = await db.inventoryMovement.findMany({ where: { variantId: v.id, type: "TRANSFER" } });
    expect(dong).toHaveLength(2);
    expect(dong.reduce((n, d) => n + d.delta, 0)).toBe(0);
    expect(new Set(dong.map((d) => d.warehouseId))).toEqual(new Set([chinh.id, khac.id]));
  });

  it("không chuyển quá số đang có ở kho đi", async () => {
    const v = await bienThe(5);
    const chinh = await db.warehouse.findFirstOrThrow({ where: { isMain: true }, select: { id: true } });
    const khac = await db.warehouse.findFirstOrThrow({ where: { isMain: false }, select: { id: true } });

    await expect(
      db.$transaction((tx) =>
        chuyenKho(tx, { variantId: v.id, tuKho: chinh.id, denKho: khac.id, soLuong: 99 }),
      ),
    ).rejects.toThrow(InsufficientStockError);
  });

  it("kho đi và kho đến trùng nhau thì chặn", async () => {
    const v = await bienThe(5);
    const chinh = await db.warehouse.findFirstOrThrow({ where: { isMain: true }, select: { id: true } });
    await expect(
      db.$transaction((tx) =>
        chuyenKho(tx, { variantId: v.id, tuKho: chinh.id, denKho: chinh.id, soLuong: 1 }),
      ),
    ).rejects.toThrow(SameWarehouseError);
  });

  it("phiếu nhập đưa hàng vào ĐÚNG kho ghi trên phiếu", async () => {
    // Trước khi tách kho, mọi thứ rơi hết về kho chính bất kể phiếu ghi gì.
    const v = await bienThe(0);
    const khac = await db.warehouse.findFirstOrThrow({ where: { isMain: false }, select: { id: true } });

    await db.$transaction((tx) =>
      moveStock(tx, {
        variantId: v.id,
        delta: 7,
        type: "RECEIPT",
        note: "Nhập thẳng vào kho phụ",
        actorName: "kiểm thử",
        warehouseId: khac.id,
      }),
    );

    const muc = await db.stockLevel.findUniqueOrThrow({
      where: { variantId_warehouseId: { variantId: v.id, warehouseId: khac.id } },
    });
    expect(muc.qty).toBe(7);
  });
});
