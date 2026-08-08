import { appUrl } from "@/server/mail";

/**
 * Dữ liệu có cấu trúc cho trang sản phẩm (schema.org `Product`).
 *
 * Đây là thứ khiến kết quả tìm kiếm hiện **giá, tình trạng còn hàng và số sao**
 * ngay dưới đường dẫn. Không có nó thì trang vẫn được lập chỉ mục, nhưng hiện
 * trơ một dòng tiêu đề cạnh các đối thủ có đủ.
 *
 * `dangerouslySetInnerHTML` là cách duy nhất nhét JSON-LD vào `<script>`; chuỗi
 * đi qua `JSON.stringify` rồi chặn `<` nên không mở được thẻ mới.
 */
export function ProductJsonLd({
  sp,
}: {
  sp: {
    name: string;
    slug: string;
    description: string;
    sku: string;
    brand: string | null;
    image: string | null;
    price: number;
    conHang: boolean;
    ratingAvg: number;
    ratingCount: number;
  };
}) {
  const goc = appUrl();

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: sp.name,
    description: sp.description,
    sku: sp.sku,
    url: `${goc}/san-pham/${sp.slug}`,
    ...(sp.image ? { image: [goc + sp.image] } : {}),
    ...(sp.brand ? { brand: { "@type": "Brand", name: sp.brand } } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "VND",
      price: sp.price,
      availability: sp.conHang
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${goc}/san-pham/${sp.slug}`,
    },
  };

  // Chỉ khai số sao khi **có đánh giá thật**. Khai `ratingValue: 0` là nói dối
  // máy tìm kiếm, và Google phạt đúng chỗ đó.
  if (sp.ratingCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: sp.ratingAvg.toFixed(1),
      reviewCount: sp.ratingCount,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\u003c"),
      }}
    />
  );
}
