"use server";

import { revalidatePath } from "next/cache";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import {
  changePassword,
  changePasswordSchema,
  EmailTakenError,
  PhoneTakenError,
  profileSchema,
  updateProfile,
  WrongPasswordError,
} from "@/server/accounts";
import { addressSchema, deleteAddress, saveAddress, setDefaultAddress } from "@/server/addresses";
import { cancelOrder, CannotCancelError } from "@/server/orders";
import { toggleWishlist } from "@/server/wishlist";

/**
 * Việc khách tự làm được với tài khoản của mình.
 *
 * Mọi hàm ở đây **tự lấy `userId` từ phiên**, không nhận từ form. Nhận từ form
 * là mở đường cho việc sửa hồ sơ hay xoá địa chỉ của người khác chỉ bằng cách
 * đổi một ô ẩn.
 */

export type TaiKhoanState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

async function toiLaAi(): Promise<string | null> {
  return currentUserId();
}

function loiTheoTruong(issues: { path: (string | number)[]; message: string }[]) {
  const e: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "");
    if (k && !e[k]) e[k] = i.message;
  }
  return e;
}

/** Không bao giờ trả mật khẩu ngược về trang. */
function daNhap(form: FormData): Record<string, string> {
  const ra: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v !== "string") continue;
    if (/password|current/i.test(k)) continue;
    ra[k] = v;
  }
  return ra;
}

/* ── Hồ sơ ────────────────────────────────────────────────── */

export async function luuHoSoAction(
  _prev: TaiKhoanState,
  form: FormData,
): Promise<TaiKhoanState> {
  const userId = await toiLaAi();
  if (!userId) return { ok: false, message: "Bạn cần đăng nhập." };

  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return {
      ok: false,
      errors: loiTheoTruong(parsed.error.issues),
      message: "Kiểm tra lại các ô được đánh dấu.",
      values: daNhap(form),
    };
  }

  try {
    await updateProfile(userId, parsed.data);
  } catch (e) {
    if (e instanceof PhoneTakenError || e instanceof EmailTakenError) {
      return { ok: false, message: e.message, values: daNhap(form) };
    }
    console.error(e);
    return { ok: false, message: "Chưa lưu được. Bạn thử lại giúp.", values: daNhap(form) };
  }

  revalidatePath("/tai-khoan");
  return { ok: true, message: "Đã lưu thay đổi hồ sơ." };
}

/* ── Đổi mật khẩu ─────────────────────────────────────────── */

export async function doiMatKhauAction(
  _prev: TaiKhoanState,
  form: FormData,
): Promise<TaiKhoanState> {
  const userId = await toiLaAi();
  if (!userId) return { ok: false, message: "Bạn cần đăng nhập." };

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, errors: loiTheoTruong(parsed.error.issues), message: "Kiểm tra lại các ô." };
  }
  if (parsed.data.password !== parsed.data.password2) {
    return { ok: false, errors: { password2: "Hai lần nhập không khớp" }, message: "Kiểm tra lại các ô." };
  }

  try {
    await changePassword(userId, { current: parsed.data.current, password: parsed.data.password });
  } catch (e) {
    if (e instanceof WrongPasswordError) {
      return { ok: false, errors: { current: e.message }, message: e.message };
    }
    console.error(e);
    return { ok: false, message: "Chưa đổi được mật khẩu. Bạn thử lại giúp." };
  }

  /*
   * Không chuyển trang. Đổi mật khẩu đẩy `sessionsValidFrom`, nên phiên hiện
   * tại cũng chết ở lượt tải kế tiếp — nói trước để khách khỏi tưởng bị lỗi.
   */
  return {
    ok: true,
    message: "Đã đổi mật khẩu. Mọi thiết bị khác đang đăng nhập đã bị đăng xuất.",
  };
}

/* ── Sổ địa chỉ ───────────────────────────────────────────── */

export async function luuDiaChiAction(
  _prev: TaiKhoanState,
  form: FormData,
): Promise<TaiKhoanState> {
  const userId = await toiLaAi();
  if (!userId) return { ok: false, message: "Bạn cần đăng nhập." };

  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return {
      ok: false,
      errors: loiTheoTruong(parsed.error.issues),
      message: "Kiểm tra lại các ô được đánh dấu.",
      values: daNhap(form),
    };
  }

  const id = String(form.get("id") ?? "") || undefined;
  try {
    await saveAddress(userId, parsed.data, id);
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Chưa lưu được địa chỉ.", values: daNhap(form) };
  }

  revalidatePath("/tai-khoan");
  return { ok: true, message: id ? "Đã cập nhật địa chỉ." : "Đã thêm địa chỉ." };
}

export async function xoaDiaChiAction(id: string): Promise<void> {
  const userId = await toiLaAi();
  if (!userId) return;
  // `deleteAddress` nhận userId nên không xoá nhầm địa chỉ người khác.
  await deleteAddress(userId, id);
  revalidatePath("/tai-khoan");
}

export async function datMacDinhAction(id: string): Promise<void> {
  const userId = await toiLaAi();
  if (!userId) return;
  await setDefaultAddress(userId, id);
  revalidatePath("/tai-khoan");
}

/* ── Huỷ đơn ──────────────────────────────────────────────── */

export type HuyDonState = { ok?: boolean; message?: string };

/**
 * Khách tự huỷ đơn của mình.
 *
 * Kiểm **đơn có đúng của người đang đăng nhập không** trước khi gọi
 * `cancelOrder` — hàm đó chỉ nhận mã đơn, nên gọi thẳng là ai biết mã đơn của
 * người khác cũng huỷ được.
 */
export async function huyDonAction(_prev: HuyDonState, form: FormData): Promise<HuyDonState> {
  const userId = await toiLaAi();
  if (!userId) return { ok: false, message: "Bạn cần đăng nhập." };

  const code = String(form.get("code") ?? "").trim();
  const don = await db.order.findUnique({ where: { code }, select: { userId: true } });
  if (!don || don.userId !== userId) {
    return { ok: false, message: "Không tìm thấy đơn này trong tài khoản của bạn." };
  }

  try {
    await cancelOrder(code, "Khách", "Khách tự huỷ trên website");
  } catch (e) {
    if (e instanceof CannotCancelError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Chưa huỷ được đơn. Bạn gọi 1900 6060 giúp." };
  }

  revalidatePath("/tai-khoan");
  return { ok: true, message: "Đã huỷ đơn " + code + "." };
}

/* ── Yêu thích ────────────────────────────────────────────── */

export async function thichAction(productId: string): Promise<boolean> {
  const userId = await toiLaAi();
  if (!userId) return false;
  const ket = await toggleWishlist(userId, productId);
  revalidatePath("/tai-khoan");
  return ket;
}
