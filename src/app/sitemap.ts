import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { appUrl } from "@/server/mail";

/**
 * Sơ đồ trang cho máy tìm kiếm.
 *
 * Chỉ liệt kê những trang **ai cũng xem được**: trang chủ, danh sách, từng danh
 * mục và từng sản phẩm đang bán. Sản phẩm `DRAFT`/`ARCHIVED` không vào đây —
 * đưa vào là mời Google dẫn khách tới một trang 404.
 */
export const revalidate = 3600;

/**
 * Dựng khi có người hỏi, không dựng lúc build.
 *
 * Mặc định Next sinh sẵn file này lúc `next build` — nghĩa là **build phải nối
 * được vào cơ sở dữ liệu**. Trên máy dev thì Postgres đang chạy nên không ai
 * nhận ra, còn dựng ảnh Docker thì không có DB nào cả và cả bản build đổ. Buộc
 * build phải có DB cũng sai về nguyên tắc: ảnh phải dựng được ở bất cứ đâu, kể
 * cả trên máy CI không có gì ngoài mã nguồn.
 *
 * `revalidate` ở trên vẫn giữ nguyên tác dụng: sinh xong thì giữ một giờ.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const goc = appUrl();

  const [sanPham, danhMuc] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    db.category.findMany({ select: { slug: true } }),
  ]);

  const tinh: MetadataRoute.Sitemap = [
    { url: goc, changeFrequency: "daily", priority: 1 },
    { url: goc + "/san-pham", changeFrequency: "daily", priority: 0.9 },
    { url: goc + "/ho-tro", changeFrequency: "monthly", priority: 0.4 },
    { url: goc + "/chinh-sach/doi-tra", changeFrequency: "yearly", priority: 0.3 },
    { url: goc + "/chinh-sach/bao-mat", changeFrequency: "yearly", priority: 0.3 },
    { url: goc + "/tra-cuu-don", changeFrequency: "monthly", priority: 0.3 },
  ];

  return [
    ...tinh,
    ...danhMuc.map((c) => ({
      url: `${goc}/danh-muc/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...sanPham.map((p) => ({
      url: `${goc}/san-pham/${p.slug}`,
      lastModified: p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
