"use server";

import { headers } from "next/headers";
import { docIpKhach } from "@/lib/client-ip";
import { dangKyNhanTin, emailSchema } from "@/server/newsletter";
import { rateLimit } from "@/server/rate-limit";

export type NhanTinState = { ok?: boolean; message?: string; email?: string };

export async function dangKyNhanTinAction(
  _prev: NhanTinState,
  form: FormData,
): Promise<NhanTinState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Email không hợp lệ",
      email: String(form.get("email") ?? ""),
    };
  }

  // Ô này nằm ngay trang chủ và không cần đăng nhập — không chặn thì nó là chỗ
  // đổ rác vào danh sách gửi thư.
  const ip = docIpKhach(await headers());
  if (!(await rateLimit("nhan-tin:" + ip, 10, 60 * 60 * 1000)).ok) {
    return { ok: false, message: "Bạn thử khá nhiều lần rồi. Thử lại sau một giờ nhé." };
  }

  try {
    await dangKyNhanTin(parsed.data);
  } catch (e) {
    console.error("[nhan-tin]", e);
    return { ok: false, message: "Chưa lưu được. Bạn thử lại giúp.", email: parsed.data };
  }

  return { ok: true, message: "Xong. Thư đầu tiên sẽ tới trước đợt sale gần nhất." };
}
