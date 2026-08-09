import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container, Crumbs } from "@/components/storefront/shell";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { VariantPicker } from "@/components/storefront/variant-picker";
import { ReviewSection, Stars } from "@/components/storefront/review-list";
import { ReviewForm } from "@/components/storefront/review-form";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { getProductBySlug, getRelated, type ProductDetail } from "@/server/catalog";
import { bangSizeCho } from "@/server/size-charts";
import { effectivePrice } from "@/lib/catalog";
import { formatVnd } from "@/lib/money";
import { Photo } from "@/components/ui/photo";
import { currentUserId } from "@/auth";
import { isWished } from "@/server/wishlist";
import { ProductJsonLd } from "@/components/storefront/product-jsonld";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Không tìm thấy sản phẩm — Men Style House" };
  return {
    title: product.name + " — Men Style House",
    description: product.description.slice(0, 160),
  };
}

/** Bốn mục gập bên dưới khối mua hàng, đúng thứ tự mockup. */
function accordionsFor(p: ProductDetail) {
  const colors = [...new Set(p.variants.map((v) => v.color))].join(", ");
  return [
    { title: "Mô tả sản phẩm", body: p.description },
    {
      title: "Chất liệu & bảo quản",
      body: [p.material, p.careNote].filter(Boolean).join("\n"),
    },
    {
      title: "Màu & size có sẵn",
      body:
        "Màu: " +
        colors +
        "\nSize: " +
        [...new Set(p.variants.map((v) => v.size))].join(", "),
    },
    {
      title: "Giao hàng & đổi trả",
      body:
        "Giao toàn quốc 2–4 ngày, nội thành TP.HCM và Hà Nội 1–2 ngày.\n" +
        "Miễn phí giao cho đơn từ 500.000 ₫.\n" +
        "Đổi size miễn phí trong 15 ngày, sản phẩm còn nguyên tem mác.",
    },
  ].filter((a) => a.body.trim() !== "");
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, userId, bangSize] = await Promise.all([
    getRelated(product),
    currentUserId(),
    /*
     * Bảng size lấy từ DB, quản lý ở `/admin/bang-size`. Sản phẩm có bảng riêng
     * thì đè bảng của danh mục — một mẫu oversize không nên phải tách hẳn một
     * danh mục chỉ vì số đo khác.
     */
    bangSizeCho({
      productSizeChartId: product.sizeChartId,
      categorySizeChartId: product.category.sizeChartId,
    }),
  ]);
  const daThich = userId ? await isWished(userId, product.id) : false;

  const conHang = product.variants.some((v) => v.stock > 0);

  return (
    <>
      <ProductJsonLd
        sp={{
          name: product.name,
          slug: product.slug,
          description: product.seoDescription || product.description,
          sku: product.code,
          brand: product.brand?.name ?? null,
          image: product.images[0]?.url ?? null,
          price: effectivePrice(product),
          conHang,
          ratingAvg: product.ratingAvg,
          ratingCount: product.ratingCount,
        }}
      />
      <Header />

      <main>
        <Container className="pb-16 pt-6">
          <Crumbs parts={["TRANG CHỦ", "SẢN PHẨM", product.name.toUpperCase()]} />

          {/*
            `grid-cols-1` chứ không để lưới tự chọn một cột: cột ngầm co giãn
            theo max-content, mà dải thumbnail cuộn ngang có max-content bằng
            tổng bề rộng mọi ảnh. Sản phẩm từ 5 ảnh trở lên là trang tràn ngang
            trên điện thoại. `grid-cols-1` cho ra `minmax(0, 1fr)` nên cột không
            vượt khung, và dải thumbnail cuộn đúng như thiết kế.
          */}
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
            <ProductGallery images={product.images} name={product.name} />

            <div>
              <div className="label-tech font-bold tracking-[0.1em] text-neutral-400">
                {product.brand ? product.brand.name + " · " : ""}
                {product.category.name}
              </div>

              <h1 className="my-3 text-[26px] leading-[1.15] lg:text-[40px] lg:leading-[1.1]">
                {product.name}
              </h1>

              <div className="mb-6 flex items-center gap-2.5 text-[13px] text-muted">
                {product.ratingCount > 0 ? (
                  <>
                    <Stars value={product.ratingAvg} />
                    <a href="#danh-gia" className="hover:text-accent-700">
                      {product.ratingAvg.toFixed(1)} · {product.ratingCount} đánh giá
                    </a>
                  </>
                ) : (
                  <span>Chưa có đánh giá</span>
                )}
              </div>

              <VariantPicker
                variants={product.variants.map((v) => ({
                  id: v.id,
                  sku: v.sku,
                  color: v.color,
                  colorHex: v.colorHex,
                  size: v.size,
                  stock: v.stock,
                  lowStockAt: v.lowStockAt,
                  priceDelta: v.priceDelta,
                }))}
                basePrice={product.basePrice}
                salePrice={product.salePrice}
                sizeChart={bangSize}
                accordions={accordionsFor(product)}
              />

              {/* Lưu để mua sau — tab "Sản phẩm yêu thích" ở trang tài khoản. */}
              <div className="mt-4">
                <WishlistButton
                  productId={product.id}
                  daThich={daThich}
                  daDangNhap={Boolean(userId)}
                />
              </div>
            </div>
          </div>

          <ReviewSection
            reviews={product.reviews}
            ratingAvg={product.ratingAvg}
            ratingCount={product.ratingCount}
          />
          <ReviewForm productId={product.id} />

          {related.length > 0 ? (
            <section className="mt-14 border-t-2 border-divider pt-6">
              <h2 className="mb-6 text-[28px]">Có thể bạn cũng thích</h2>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {related.map((p) => (
                  <Link key={p.id} href={{ pathname: "/san-pham/" + p.slug }} className="group">
                    <div className="relative aspect-[3/4] w-full bg-subtle">
                      {p.images[0] ? (
                        <Photo
                          src={p.images[0].url}
                          alt={p.images[0].alt}
                          sizes="(min-width: 768px) 25vw, 50vw"
                        />
                      ) : null}
                    </div>
                    <h3 className="mb-1.5 mt-3 text-[14.5px] font-semibold leading-[1.35] group-hover:text-accent-700">
                      {p.name}
                    </h3>
                    <span className="text-[15px] font-extrabold">
                      {formatVnd(effectivePrice(p))}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}
