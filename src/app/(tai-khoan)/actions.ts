"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { mergeGuestCart } from "@/server/cart";
import { PhoneTakenError, registerSchema, registerUser } from "@/server/accounts";
import { db } from "@/lib/db";

export type AuthState = {
  errors?: Record<string, string>;
  message?: string;
  /**
   * Những gì vừa gõ, trả về để điền lại form.
   *
   * React 19 **tự reset** `<form action={...}>` sau mỗi lượt chạy, nên gõ lệch
   * ô nhập lại mật khẩu là mất luôn cả họ tên, số điện thoại và email đã điền.
   *
   * **Không bao giờ kèm mật khẩu** — trả ngược về là đem mật khẩu ra nằm trong
   * HTML của trang và trong payload gửi qua mạng thêm một lượt nữa. Hai ô mật
   * khẩu gõ lại từ đầu, đó là chỗ vừa sai nên gõ lại cũng đúng việc.
   */
  values?: Record<string, string>;
};

const KHONG_TRA_LAI = new Set(["password", "password2"]);

function daNhap(form: FormData): Record<string, string> {
  const ra: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (KHONG_TRA_LAI.has(k) || typeof v !== "string") continue;
    ra[k] = v;
  }
  return ra;
}

/** Gộp giỏ khách vãng lai vào giỏ member — cộng qty, không ghi đè. */
async function mergeCartAfterLogin(phone: string) {
  const token = (await cookies()).get("cartToken")?.value;
  if (!token) return;
  const user = await db.user.findUnique({ where: { phone }, select: { id: true } });
  if (user) await mergeGuestCart(token, user.id);
}

function fieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "");
    if (key && !errors[key]) errors[key] = i.message;
  }
  return errors;
}

export async function registerAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return {
      errors: fieldErrors(parsed.error.issues),
      message: "Kiểm tra lại các ô được đánh dấu.",
      values: daNhap(form),
    };
  }

  try {
    await registerUser(parsed.data);
    await mergeCartAfterLogin(parsed.data.phone);
    await signIn("credentials", {
      phone: parsed.data.phone,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof PhoneTakenError) {
      return { errors: { phone: e.message }, values: daNhap(form) };
    }
    console.error(e);
    return { message: "Không tạo được tài khoản. Bạn thử lại giúp.", values: daNhap(form) };
  }

  redirect("/tai-khoan");
}

export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const phone = String(form.get("phone") ?? "").trim();
  const password = String(form.get("password") ?? "");

  try {
    await signIn("credentials", { phone, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      return { message: "Số điện thoại hoặc mật khẩu không đúng.", values: { phone } };
    }
    throw e;
  }

  // Gộp giỏ sau khi đăng nhập thành công, trước khi rời trang.
  await mergeCartAfterLogin(phone);
  redirect("/tai-khoan");
}

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/");
}
