import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * Đặt lại mật khẩu.
 *
 * ── Ba luật an toàn ───────────────────────────────────────────────────────
 *
 * 1. **Không tiết lộ tài khoản có tồn tại hay không.** `yeuCauDatLai` trả về
 *    kiểu như nhau dù tìm thấy hay không. Trả lời khác nhau là biến form này
 *    thành máy dò: gõ lần lượt vài nghìn số điện thoại là biết số nào có tài
 *    khoản ở cửa hàng.
 *
 * 2. **Token dùng một lần, hạn 1 giờ.** Ngắn hơn lời mời (7 ngày) rất nhiều —
 *    lời mời là thứ người ta chờ, còn token này là chìa khoá vào một tài khoản
 *    đã tồn tại.
 *
 * 3. **Yêu cầu mới huỷ yêu cầu cũ.** Chỉ một đường dẫn còn sống, nên bấm nhầm
 *    "gửi lại" vài lần không rải ra vài cái chìa cùng lúc.
 */

const HAN_PHUT = 60;

export type YeuCauKetQua =
  | { gui: true; token: string; email: string; ten: string }
  /** Không tìm thấy, tài khoản đã tắt, hoặc không có email để gửi tới. */
  | { gui: false };

/**
 * Nhận số điện thoại hoặc email, tạo token nếu có tài khoản dùng được.
 *
 * Nơi gọi **luôn** hiện cùng một thông báo cho người dùng, bất kể kết quả.
 */
export async function yeuCauDatLai(dinhDanh: string): Promise<YeuCauKetQua> {
  const v = dinhDanh.trim();
  const laSo = /^0\d{9}$/.test(v);

  const user = laSo
    ? await db.user.findUnique({ where: { phone: v } })
    : await db.user.findUnique({ where: { email: v.toLowerCase() } });

  // Không có email thì không gửi được đi đâu — coi như không tìm thấy.
  if (!user || !user.active || !user.email) return { gui: false };

  await db.passwordReset.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const han = new Date(Date.now() + HAN_PHUT * 60_000);
  const { token } = await db.passwordReset.create({
    data: { userId: user.id, token: randomBytes(24).toString("base64url"), expiresAt: han },
    select: { token: true },
  });

  return { gui: true, token, email: user.email, ten: user.name };
}

export class ResetInvalidError extends Error {
  constructor(message = "Đường dẫn đặt lại mật khẩu đã hết hạn hoặc đã dùng rồi.") {
    super(message);
    this.name = "ResetInvalidError";
  }
}

/** Đọc token để dựng màn đặt mật khẩu mới. Hỏng thì trả `null`. */
export async function docYeuCau(token: string) {
  const r = await db.passwordReset.findUnique({
    where: { token },
    select: {
      id: true,
      usedAt: true,
      expiresAt: true,
      user: { select: { name: true, email: true, active: true } },
    },
  });
  if (!r || r.usedAt || r.expiresAt < new Date() || !r.user.active) return null;
  return { ten: r.user.name, email: r.user.email };
}

/**
 * Đặt mật khẩu mới.
 *
 * Kiểm lại hạn và trạng thái **bên trong transaction**: giữa lúc mở trang và
 * lúc bấm nút, token có thể đã bị một yêu cầu mới huỷ mất.
 */
export async function datLaiMatKhau(input: { token: string; password: string }) {
  const hash = await bcrypt.hash(input.password, 10);

  return db.$transaction(async (tx) => {
    const r = await tx.passwordReset.findUnique({
      where: { token: input.token },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true,
        user: { select: { active: true } },
      },
    });
    if (!r || r.usedAt || r.expiresAt < new Date() || !r.user.active) throw new ResetInvalidError();

    /*
     * Đẩy `sessionsValidFrom` **cùng lúc** với mật khẩu.
     *
     * Người đi đặt lại mật khẩu thường vì nghi có kẻ vào được tài khoản. Đổi
     * mật khẩu mà để phiên cũ sống tiếp thì kẻ đó vẫn ngồi nguyên bên trong —
     * việc đổi mật khẩu coi như không có tác dụng gì.
     */
    await tx.user.update({
      where: { id: r.userId },
      data: { passwordHash: hash, sessionsValidFrom: new Date() },
    });
    await tx.passwordReset.update({ where: { id: r.id }, data: { usedAt: new Date() } });

    return { userId: r.userId };
  });
}
