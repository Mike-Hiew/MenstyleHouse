"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { yeuCauDatLai } from "@/server/password-reset";
import { mailDatLaiMatKhau } from "@/server/mail-templates";
import { getSettings } from "@/server/settings";
import { rateLimit } from "@/server/rate-limit";

export type QuenState = { ok?: boolean; message?: string };

const schema = z.object({
  dinhDanh: z.string().trim().min(5, "Nhập số điện thoại hoặc email").max(120),
});

/**
 * Nhận yêu cầu đặt lại mật khẩu.
 *
 * **Luôn trả về cùng một câu**, dù tài khoản có tồn tại hay không. Trả lời khác
 * nhau là biến form này thành máy dò: gõ lần lượt vài nghìn số là biết số nào
 * có tài khoản ở cửa hàng.
 */
const CAU_TRA_LOI =
  "Nếu tài khoản tồn tại và có email, cửa hàng đã gửi đường dẫn đặt lại mật khẩu. " +
  "Kiểm tra cả hộp thư rác giúp nhé.";

export async function quenMatKhauAction(_prev: QuenState, form: FormData): Promise<QuenState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  /*
   * Giới hạn theo IP: form này gửi được mà không cần đăng nhập, và mỗi lượt là
   * một email rời khỏi hệ thống. Không chặn thì nó thành công cụ dội thư vào
   * hộp thư người khác.
   */
  if (!(await rateLimit("quen-mk:" + ip, 5, 60 * 60 * 1000)).ok) {
    return { ok: false, message: "Bạn đã thử khá nhiều lần. Thử lại sau một giờ hoặc gọi 1900 6060." };
  }

  try {
    const ket = await yeuCauDatLai(parsed.data.dinhDanh);
    if (ket.gui) {
      const caiDat = await getSettings();
      await mailDatLaiMatKhau({
        to: ket.email,
        ten: ket.ten,
        token: ket.token,
        hotline: caiDat.hotline,
      });
    }
  } catch (e) {
    // Lỗi kỹ thuật cũng không được lộ ra là tài khoản có hay không.
    console.error("[quen-mat-khau]", e);
  }

  return { ok: true, message: CAU_TRA_LOI };
}
