import type { MetadataRoute } from "next";
import { appUrl } from "@/server/mail";

/**
 * Chặn máy tìm kiếm khỏi những trang **riêng tư hoặc vô nghĩa khi lập chỉ mục**:
 * khu quản trị, giỏ hàng, thanh toán, tài khoản, và các đường dẫn mang token.
 *
 * Không chặn thì Google vẫn không vào được (đã có chốt đăng nhập), nhưng nó sẽ
 * tốn lượt quét vào những trang trả về chuyển hướng, và các URL chứa token đặt
 * lại mật khẩu có thể bị ghi lại ở đâu đó.
 */
export default function robots(): MetadataRoute.Robots {
  const goc = appUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/gio-hang",
          "/thanh-toan",
          "/tai-khoan",
          "/dat-hang-thanh-cong",
          "/dat-lai-mat-khau",
          "/nhan-loi-moi",
          "/quen-mat-khau",
          "/api/",
        ],
      },
    ],
    sitemap: goc + "/sitemap.xml",
  };
}
