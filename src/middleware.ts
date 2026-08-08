import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Chặn sớm khu `/admin` để không tốn công render trang rồi mới đá ra.
 * Đây **không** phải lớp bảo vệ duy nhất — mỗi trang và mỗi Server Action vẫn
 * tự gọi `requireStaff()`/`assertStaff()` ở server.
 */

const STAFF = new Set(["STAFF", "WAREHOUSE", "ACCOUNTANT", "ADMIN"]);

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const role = typeof token?.role === "string" ? token.role : null;

  if (role && STAFF.has(role)) return NextResponse.next();

  const url = req.nextUrl.clone();
  if (!token) {
    url.pathname = "/dang-nhap";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Đã đăng nhập nhưng là khách hàng thường: về trang chủ, không lộ khu quản trị.
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin/:path*"] };
