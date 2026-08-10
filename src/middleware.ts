import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Chặn sớm khu `/admin` để không tốn công render trang rồi mới đá ra.
 * Đây **không** phải lớp bảo vệ duy nhất — mỗi trang và mỗi Server Action vẫn
 * tự gọi `requireStaff()`/`assertStaff()` ở server.
 *
 * Từ M6.22 vai trò là dữ liệu, nên ở đây **không còn danh sách vai trò viết
 * cứng**. Middleware chạy trên Edge và không đọc được DB, nên nó đọc cờ `staff`
 * mà `auth.ts` đặt sẵn vào token — một danh sách viết cứng sẽ không bao giờ biết
 * `TRUONG_CA` là nhân viên.
 */

export async function middleware(req: NextRequest) {
  /*
   * Tên cookie phiên đổi theo giao thức: chạy HTTPS thì Auth.js đặt
   * `__Secure-authjs.session-token`, chạy HTTP thì `authjs.session-token`.
   *
   * `getToken` phải được khai đúng, vì nó không đoán ra: sau reverse proxy
   * (Vercel, Caddy, nginx) thì chặng vào app vẫn là HTTP, nên nó mặc định đi
   * tìm tên không có tiền tố, không thấy cookie nào, và kết luận là khách chưa
   * đăng nhập. Triệu chứng: bấm vào `/admin` bị đá về `/dang-nhap`, trang đó
   * thấy đã đăng nhập rồi nên đẩy ngược lại — quay vòng mà không báo lỗi gì.
   *
   * Đọc `x-forwarded-proto` thay vì tin `nextUrl.protocol`. Header này khách
   * bịa được, nhưng bịa cũng chỉ khiến `getToken` tìm nhầm tên rồi trả `null`
   * — tức là hỏng theo hướng khoá cửa, không phải mở cửa.
   */
  const secureCookie =
    req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";

  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie });

  /*
   * So `=== true` chứ không phải `!token.staff`: token phát trước M6.22 chưa có
   * trường này. Coi `undefined` là **chưa biết** và đá về đăng nhập — người đó
   * đăng nhập lại một lần là có token mới kèm cờ. Đoán bừa theo hướng cho qua
   * thì mọi phiên cũ đi thẳng vào khu quản trị.
   */
  if (token?.staff === true) return NextResponse.next();

  const url = req.nextUrl.clone();
  if (!token) {
    url.pathname = "/dang-nhap";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Đã đăng nhập nhưng không phải nhân viên: về trang chủ, không lộ khu quản trị.
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin/:path*"] };
