import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Ai được xem trang "Đặt hàng thành công" đầy đủ.
 *
 * Mã đơn tăng dần (`MSH-2026-00148`), đoán được. Trước đây trang
 * `/dat-hang-thanh-cong/<mã>` hiện cho bất kỳ ai, kèm link tra cứu chứa sẵn 4
 * số cuối điện thoại — đủ để mở trang tra cứu và đọc tên, số điện thoại, địa
 * chỉ nhà của khách khác.
 *
 * Giờ chỉ người vừa đặt đơn (cookie có chữ ký, ghi lúc đặt) hoặc chủ đơn đang
 * đăng nhập mới xem được đầy đủ. Chữ ký HMAC bằng `AUTH_SECRET` nên khách
 * không tự viết cookie cho mã đơn của người khác được.
 */

const COOKIE = "msh_don";
/** Đủ lâu để khách tải lại / mở lại trang trong vài ngày, không mãi mãi. */
const MAX_AGE = 60 * 60 * 24 * 7;
/** Giữ tối đa chừng này mã đơn gần nhất trong cookie. */
const KEEP = 5;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Thiếu AUTH_SECRET");
  return s;
}

export function signOrderCode(code: string, key = secret()): string {
  return createHmac("sha256", key).update("don:" + code).digest("base64url").slice(0, 32);
}

export function verifyOrderCode(code: string, sig: string, key = secret()): boolean {
  const want = Buffer.from(signOrderCode(code, key));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** Đọc cookie "mã.chữ-ký|mã.chữ-ký…" thành danh sách cặp. */
export function parseOrderCookie(raw: string | undefined): { code: string; sig: string }[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((part) => {
      const i = part.lastIndexOf(".");
      return i > 0 ? { code: part.slice(0, i), sig: part.slice(i + 1) } : null;
    })
    .filter((x): x is { code: string; sig: string } => x !== null)
    .slice(0, KEEP);
}

/** Gọi trong server action đặt đơn, trước khi chuyển sang trang thành công. */
export async function rememberPlacedOrder(code: string): Promise<void> {
  const jar = await cookies();
  const cu = parseOrderCookie(jar.get(COOKIE)?.value).filter((x) => x.code !== code);
  const moi = [{ code, sig: signOrderCode(code) }, ...cu].slice(0, KEEP);
  jar.set(COOKIE, moi.map((x) => x.code + "." + x.sig).join("|"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/dat-hang-thanh-cong",
    maxAge: MAX_AGE,
  });
}

/** Trình duyệt này có phải nơi vừa đặt đơn `code` không. */
export async function placedHere(code: string): Promise<boolean> {
  const jar = await cookies();
  return parseOrderCookie(jar.get(COOKIE)?.value).some(
    (x) => x.code === code && verifyOrderCode(code, x.sig),
  );
}
