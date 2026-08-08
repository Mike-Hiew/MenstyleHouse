import "server-only";
import { db } from "@/lib/db";
import { cancelOrder } from "@/server/orders";
import { getSettings } from "@/server/settings";

/**
 * Thanh toán chuyển khoản và dọn đơn quá hạn.
 *
 * Chuyển khoản không có webhook: không ai báo cho website biết tiền đã về. Nên
 * đường duy nhất là **người thật đối chiếu sao kê rồi bấm xác nhận**, và mọi
 * lần bấm đều để lại một dòng trong `OrderEvent`.
 */

/**
 * Giữ đơn chưa thanh toán bao lâu trước khi tự huỷ.
 *
 * Mockup `orderFail` hứa thẳng với khách "đơn vẫn được giữ trong 2 giờ", nên
 * lấy đúng 2 giờ. `BUILD-PLAN.md` viết 30 phút; huỷ ở phút 30 trong khi màn
 * hình vừa hứa 2 tiếng là tự tạo ra một lời nói dối, và tồn kho giữ thêm 90
 * phút rẻ hơn nhiều so với một khách quay lại thấy đơn biến mất.
 */
export const GIU_DON_PHUT_MAC_DINH = 120;

/**
 * Phương thức trả trước — chỉ những đơn này mới bị huỷ vì quá hạn.
 *
 * COD **không** nằm ở đây: đơn COD chưa trả tiền là chuyện bình thường cho tới
 * lúc giao hàng. Gom chung là mỗi đêm tự huỷ sạch đơn COD đang chờ giao.
 */
const TRA_TRUOC = ["BANK_TRANSFER", "VNPAY", "MOMO", "ZALOPAY"] as const;

export class NotAwaitingTransferError extends Error {
  constructor(code: string) {
    super(`Đơn ${code} không ở trạng thái chờ chuyển khoản.`);
    this.name = "NotAwaitingTransferError";
  }
}

/**
 * Đánh dấu đã nhận được tiền chuyển khoản.
 *
 * Gọi lại lần hai không làm gì thêm — nhân viên bấm hai lần không được sinh
 * thêm `Payment` hay thêm dòng lịch sử.
 */
export async function confirmBankTransfer(
  code: string,
  actorName: string,
  note?: string,
): Promise<{ daXacNhanTruocDo: boolean }> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        status: true,
        total: true,
        paymentMethod: true,
        paymentStatus: true,
      },
    });
    if (!order) throw new NotAwaitingTransferError(code);
    if (order.paymentStatus === "PAID") return { daXacNhanTruocDo: true };
    if (order.paymentMethod !== "BANK_TRANSFER" || order.status === "CANCELLED") {
      throw new NotAwaitingTransferError(code);
    }

    const paidAt = new Date();

    // Payment tạo sẵn lúc đặt đơn; cập nhật chính nó thay vì tạo bản ghi thứ hai.
    const capNhat = await tx.payment.updateMany({
      where: { orderId: order.id, status: "UNPAID" },
      data: { status: "PAID", paidAt },
    });
    if (capNhat.count === 0) {
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: "BANK_TRANSFER",
          amount: order.total,
          status: "PAID",
          paidAt,
        },
      });
    }

    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID" } });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: ["Đã nhận chuyển khoản", note?.trim()].filter(Boolean).join(" — "),
        actorName,
      },
    });

    return { daXacNhanTruocDo: false };
  });
}

/**
 * Huỷ những đơn trả trước để quá hạn mà chưa thấy tiền.
 *
 * Đi qua `cancelOrder` chứ không `UPDATE status` thẳng: huỷ đơn còn phải hoàn
 * tồn qua `moveStock`, trả lượt mã giảm giá và hoàn điểm. Bỏ qua một trong số
 * đó là hàng nằm chết trong kho mà sổ vẫn ghi đã bán.
 */
export async function expireUnpaidOrders(now = new Date()) {
  const { holdMinutes } = await getSettings();
  const han = new Date(now.getTime() - holdMinutes * 60_000);

  const quaHan = await db.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: "UNPAID",
      paymentMethod: { in: [...TRA_TRUOC] },
      createdAt: { lt: han },
    },
    select: { code: true },
  });

  const daHuy: string[] = [];
  const loi: { code: string; message: string }[] = [];

  for (const o of quaHan) {
    try {
      await cancelOrder(o.code, "Hệ thống", `Quá ${holdMinutes} phút chưa nhận được thanh toán`);
      daHuy.push(o.code);
    } catch (e) {
      // Một đơn hỏng không được chặn những đơn còn lại.
      loi.push({ code: o.code, message: e instanceof Error ? e.message : String(e) });
    }
  }

  return { daHuy, loi };
}
