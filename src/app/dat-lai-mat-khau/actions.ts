"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { datLaiMatKhau, ResetInvalidError } from "@/server/password-reset";

export type DatLaiState = { ok?: boolean; message?: string };

const schema = z.object({
  token: z.string().trim().min(10),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(72),
  password2: z.string(),
});

/**
 * Đặt mật khẩu mới.
 *
 * Tối thiểu 8 ký tự — dài hơn mức 6 của lúc đăng ký. Người đang đặt lại mật
 * khẩu thường là người vừa mất quyền vào tài khoản; không nên cho họ quay lại
 * đúng mức yếu như cũ.
 */
export async function datLaiAction(_prev: DatLaiState, form: FormData): Promise<DatLaiState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  if (parsed.data.password !== parsed.data.password2) {
    return { ok: false, message: "Hai lần nhập mật khẩu không khớp." };
  }

  try {
    await datLaiMatKhau({ token: parsed.data.token, password: parsed.data.password });
  } catch (e) {
    if (e instanceof ResetInvalidError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không đặt lại được mật khẩu. Bạn thử lại giúp." };
  }

  redirect("/dang-nhap?dat-lai=1");
}
