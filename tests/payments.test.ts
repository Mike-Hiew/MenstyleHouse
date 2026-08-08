import { afterEach, describe, expect, it } from "vitest";
import {
  confirmBankTransfer,
  expireUnpaidOrders,
  NotAwaitingTransferError,
} from "../src/server/payments";
import { cancelOrder } from "../src/server/orders";
import { moveStock } from "../src/lib/inventory";
import { db } from "../src/lib/db";

/** Số phút giữ đơn mà migration đặt sẵn trong cài đặt cửa hàng. */
const GIU_DON = 120;

/**
 * Thanh toán chuyển khoản và dọn đơn quá hạn.
 *
 * Hai chỗ hỏng thì hỏng nặng:
 *   1. Job quá hạn quét trúng đơn **COD** — mỗi đêm tự huỷ sạch đơn đang chờ giao.
 *   2. Huỷ đơn mà không hoàn tồn — hàng nằm chết trong kho còn sổ ghi đã bán.
 */

const rac: string[] = [];

/**
 * Dọn bằng đúng đường nghiệp vụ: huỷ đơn còn mở để `cancelOrder` hoàn tồn qua
 * `moveStock`.
 *
 * Cố ý **không** xoá `InventoryMovement`. Sổ kho là append-only; xoá vài dòng
 * cho gọn DB test sẽ làm `stock` lệch khỏi `Σ(movements.delta)` và phá luôn bài
 * test canh bất biến đó ở `tests/inventory.test.ts`.
 */
afterEach(async () => {
  for (const id of rac) {
    const o = await db.order.findUnique({ where: { id }, select: { code: true, status: true } });
    if (!o || o.status === "CANCELLED") continue;
    await cancelOrder(o.code, "Dọn kiểm thử", "Dọn dữ liệu kiểm thử");
  }
  await db.orderEvent.deleteMany({ where: { orderId: { in: rac } } });
  await db.payment.deleteMany({ where: { orderId: { in: rac } } });
  await db.orderItem.deleteMany({ where: { orderId: { in: rac } } });
  await db.order.deleteMany({ where: { id: { in: rac } } });
  rac.length = 0;
});

/** Đơn 1 món, đã trừ tồn như lúc đặt thật. */
async function datDon(opts: {
  method: "COD" | "BANK_TRANSFER";
  phutTruoc: number;
  status?: "PENDING" | "CONFIRMED";
  paid?: boolean;
}) {
  const variant = await db.variant.findFirstOrThrow({
    where: { stock: { gte: 5 } },
    select: { id: true, sku: true, color: true, size: true, stock: true, product: { select: { name: true } } },
  });

  const order = await db.order.create({
    data: {
      code: "TEST-TT-" + Math.abs(Number(process.hrtime.bigint() % 100000000n)),
      status: opts.status ?? "PENDING",
      paymentStatus: opts.paid ? "PAID" : "UNPAID",
      paymentMethod: opts.method,
      createdAt: new Date(Date.now() - opts.phutTruoc * 60_000),
      receiver: "Người kiểm thử",
      phone: "0900123456",
      province: "TP.HCM",
      district: "Phú Nhuận",
      ward: "Phường 8",
      street: "142 Nguyễn Văn Trỗi",
      subtotal: 500_000,
      total: 500_000,
      items: {
        create: {
          variantId: variant.id,
          sku: variant.sku,
          productName: variant.product.name,
          color: variant.color,
          size: variant.size,
          qty: 2,
          unitPrice: 250_000,
          lineTotal: 500_000,
        },
      },
      payments: { create: { method: opts.method, amount: 500_000, status: "UNPAID" } },
    },
    select: { id: true, code: true },
  });
  rac.push(order.id);

  // Trừ tồn qua đúng điểm vào mà `placeOrder` dùng. Tự `UPDATE stock` rồi tự
  // viết dòng sổ là phá luật số 2 ngay trong bài test canh chính luật đó.
  await db.$transaction((tx) =>
    moveStock(tx, {
      variantId: variant.id,
      delta: -2,
      type: "SALE",
      refType: "Order",
      refId: order.id,
      note: "Đặt đơn " + order.code,
      actorName: "Người kiểm thử",
    }),
  );

  return { ...order, variantId: variant.id, stockTruoc: variant.stock };
}

const tonCua = async (id: string) =>
  (await db.variant.findUniqueOrThrow({ where: { id }, select: { stock: true } })).stock;

describe("xác nhận chuyển khoản", () => {
  it("đưa đơn sang PAID, đóng Payment và ghi một dòng lịch sử", async () => {
    const don = await datDon({ method: "BANK_TRANSFER", phutTruoc: 5 });

    const ket = await confirmBankTransfer(don.code, "Kế toán A", "VCB 09:12");

    expect(ket.daXacNhanTruocDo).toBe(false);
    const sau = await db.order.findUniqueOrThrow({
      where: { id: don.id },
      select: { paymentStatus: true, payments: true, events: true },
    });
    expect(sau.paymentStatus).toBe("PAID");
    expect(sau.payments).toHaveLength(1);
    expect(sau.payments[0].status).toBe("PAID");
    expect(sau.payments[0].paidAt).toBeInstanceOf(Date);
    expect(sau.events.at(-1)?.note).toContain("VCB 09:12");
  });

  it("bấm lần hai không sinh thêm Payment hay thêm dòng lịch sử", async () => {
    const don = await datDon({ method: "BANK_TRANSFER", phutTruoc: 5 });
    await confirmBankTransfer(don.code, "Kế toán A");
    const soDong = await db.orderEvent.count({ where: { orderId: don.id } });

    const lai = await confirmBankTransfer(don.code, "Kế toán B");

    expect(lai.daXacNhanTruocDo).toBe(true);
    expect(await db.payment.count({ where: { orderId: don.id } })).toBe(1);
    expect(await db.orderEvent.count({ where: { orderId: don.id } })).toBe(soDong);
  });

  it("không xác nhận được đơn COD hay đơn đã huỷ", async () => {
    const cod = await datDon({ method: "COD", phutTruoc: 5 });
    await expect(confirmBankTransfer(cod.code, "Kế toán A")).rejects.toBeInstanceOf(
      NotAwaitingTransferError,
    );

    const huy = await datDon({ method: "BANK_TRANSFER", phutTruoc: 5 });
    // Huỷ qua đường thật để tồn được hoàn — `UPDATE status` thẳng sẽ để lại
    // hàng bị trừ vĩnh viễn trong DB test.
    await cancelOrder(huy.code, "Kiểm thử", "Dựng ca đơn đã huỷ");
    await expect(confirmBankTransfer(huy.code, "Kế toán A")).rejects.toBeInstanceOf(
      NotAwaitingTransferError,
    );
  });
});

describe("huỷ đơn trả trước quá hạn", () => {
  it("huỷ đơn chuyển khoản quá hạn và hoàn đúng số lượng về kho", async () => {
    const don = await datDon({ method: "BANK_TRANSFER", phutTruoc: GIU_DON + 10 });
    const tonSauKhiDat = await tonCua(don.variantId);

    const { daHuy } = await expireUnpaidOrders();

    expect(daHuy).toContain(don.code);
    expect(await tonCua(don.variantId)).toBe(tonSauKhiDat + 2);
    const sau = await db.order.findUniqueOrThrow({
      where: { id: don.id },
      select: { status: true },
    });
    expect(sau.status).toBe("CANCELLED");
  });

  it("giữ nguyên bất biến sổ kho sau khi huỷ", async () => {
    const don = await datDon({ method: "BANK_TRANSFER", phutTruoc: GIU_DON + 10 });
    await expireUnpaidOrders();

    const tong = await db.inventoryMovement.aggregate({
      where: { variantId: don.variantId },
      _sum: { delta: true },
    });
    expect(await tonCua(don.variantId)).toBe(tong._sum.delta ?? 0);
  });

  it("KHÔNG đụng tới đơn COD dù để bao lâu", async () => {
    // Đơn COD chưa trả tiền là bình thường cho tới lúc giao. Quét trúng nó là
    // mỗi đêm tự huỷ sạch đơn đang chờ giao.
    const cod = await datDon({ method: "COD", phutTruoc: GIU_DON * 10 });

    const { daHuy } = await expireUnpaidOrders();

    expect(daHuy).not.toContain(cod.code);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: cod.id }, select: { status: true } })).status,
    ).toBe("PENDING");
  });

  it("chưa tới hạn thì để yên", async () => {
    const don = await datDon({ method: "BANK_TRANSFER", phutTruoc: GIU_DON - 10 });
    const { daHuy } = await expireUnpaidOrders();
    expect(daHuy).not.toContain(don.code);
  });

  it("đã trả tiền hoặc đã rời PENDING thì để yên", async () => {
    const daTra = await datDon({ method: "BANK_TRANSFER", phutTruoc: GIU_DON + 10, paid: true });
    const daXacNhan = await datDon({
      method: "BANK_TRANSFER",
      phutTruoc: GIU_DON + 10,
      status: "CONFIRMED",
    });

    const { daHuy } = await expireUnpaidOrders();

    expect(daHuy).not.toContain(daTra.code);
    expect(daHuy).not.toContain(daXacNhan.code);
  });
});
