import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Đăng ký nhận tin sale.
 *
 * Hai điều đáng nói:
 *
 * 1. **Đăng ký lại email đã có không phải là lỗi.** Người ta gõ email vào ô,
 *    bấm, thấy im ru thì bấm lại — báo "email này đã đăng ký" như một lỗi đỏ là
 *    mắng khách vì một việc họ làm đúng. Gọi bao nhiêu lần cũng ra cùng một kết
 *    quả, và email đã từng huỷ nhận tin thì được bật lại.
 * 2. **Huỷ nhận tin là đánh dấu, không xoá dòng.** Xoá xong người ta đăng ký
 *    lại rồi lại nhận thư, mà không còn dấu vết là họ từng bảo đừng gửi nữa.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Nhập email của bạn")
  .max(120)
  .email("Email không hợp lệ");

export async function dangKyNhanTin(
  emailTho: string,
  source = "home",
): Promise<{ email: string }> {
  const email = emailSchema.parse(emailTho);

  await db.newsletterSubscriber.upsert({
    where: { email },
    // Đăng ký lại sau khi đã huỷ thì bật lại, không tạo dòng thứ hai.
    update: { unsubscribedAt: null },
    create: { email, source },
  });

  return { email };
}

/** Huỷ nhận tin. Email lạ cũng coi như xong — không xác nhận email có tồn tại. */
export async function huyNhanTin(emailTho: string): Promise<void> {
  const email = emailSchema.parse(emailTho);
  await db.newsletterSubscriber.updateMany({
    where: { email, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });
}
