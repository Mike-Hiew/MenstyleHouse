"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { acceptInvite, InviteInvalidError } from "@/server/admin/staff";

export type AcceptState = { ok?: boolean; message?: string };

const schema = z.object({
  token: z.string().trim().min(10),
  name: z.string().trim().min(2, "Nhập họ tên của bạn").max(80),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(72),
  password2: z.string(),
});

/**
 * Người được mời tự đặt mật khẩu.
 *
 * Không ai — kể cả quản trị — nhìn thấy mật khẩu này. Đó là lý do lời mời đi
 * bằng đường dẫn có token thay vì phát mật khẩu tạm cho quản trị đọc lại.
 */
export async function acceptInviteAction(
  _prev: AcceptState,
  form: FormData,
): Promise<AcceptState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  if (parsed.data.password !== parsed.data.password2) {
    return { ok: false, message: "Hai lần nhập mật khẩu không khớp." };
  }

  try {
    await acceptInvite(parsed.data);
  } catch (e) {
    if (e instanceof InviteInvalidError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không nhận được lời mời. Bạn thử lại giúp." };
  }

  redirect("/dang-nhap?moi=1");
}
