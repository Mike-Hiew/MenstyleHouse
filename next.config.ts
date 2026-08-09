import type { NextConfig } from "next";

const config: NextConfig = {
  /**
   * Gói sẵn để chạy trong container: Next lần theo đúng những gì mã thật sự
   * `import` rồi chép vào `.next/standalone`, nên ảnh Docker mang khoảng 420 MB
   * thay vì kéo theo trọn `node_modules`. Ảnh nhỏ thì máy 2 GB kéo về và khởi
   * động lại nhanh hơn hẳn.
   *
   * `next start` sẽ cảnh báo là không dùng được với cấu hình này — vẫn chạy,
   * nhưng trong container đã gọi thẳng `node server.js` đúng như nó khuyên.
   *
   * Trên Vercel thì tắt: nền tảng tự cắt hàm từ output của Next theo cách riêng,
   * bật `standalone` ở đó chỉ dựng thêm một bản `node_modules` không ai chạy.
   */
  output: process.env.VERCEL ? undefined : "standalone",

  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    /**
     * `/api/anh/<id>-<checksum>.webp` là URL nội dung: đổi ảnh thì đổi luôn URL.
     * Nên bản đã tối ưu không bao giờ cần làm mới — giữ một năm để mỗi ảnh chỉ
     * đọc từ Postgres đúng một lần cho mỗi bề rộng.
     */
    minimumCacheTTL: 31536000,
  },
  typedRoutes: true,
  experimental: {
    /**
     * Mặc định Server Action chỉ nhận 1 MB, trong khi upload ảnh cho phép tới
     * 8 MB (`MAX_UPLOAD_BYTES` trong `src/server/admin/images.ts`). Hai con số
     * này phải khớp nhau, nếu không ảnh lớn bị Next chặn trước khi tới chỗ
     * kiểm tra của mình và khách chỉ thấy form im lặng không phản hồi.
     */
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default config;
