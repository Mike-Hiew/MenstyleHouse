import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { VariantPicker } from "@/components/storefront/variant-picker";
import { ReviewSection } from "@/components/storefront/review-list";
import { ProductGrid } from "@/components/storefront/product-card";
import { StarRating } from "@/components/storefront/star-rating";
import { getProductBySlug, getRatingBreakdown, getRelated } from "@/server/catalog";
import { sizeChartFor } from "@/lib/size-chart";

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

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [breakdown, related] = await Promise.all([
    getRatingBreakdown(product.id),
    getRelated(product),
  ]);

  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);

  return (
    <>
      <SiteHeader />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Sản phẩm", href: "/san-pham" },
          { label: product.category.name, href: "/danh-muc/" + product.category.slug },
          { label: product.name },
        ]}
      />

      <main>
        <div className="grid gap-10 px-6 py-8 lg:grid-cols-2">
          <ProductGallery images={product.images} name={product.name} />

          <div className="flex flex-col gap-6">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-500">
                <Link
                  href={{ pathname: "/danh-muc/" + product.category.slug }}
                  className="hover:text-accent-700"
                >
                  {product.category.name}
                </Link>
                {product.brand ? <span>· {product.brand.name}</span> : null}
              </div>

              <h1 className="mb-3 text-[32px] leading-tight">{product.name}</h1>

              <div className="flex flex-wrap items-center gap-4">
                {product.ratingCount > 0 ? (
                  <a href="#danh-gia" className="hover:text-accent-700">
                    <StarRating value={product.ratingAvg} count={product.ratingCount} />
                  </a>
                ) : (
                  <span className="text-[13px] text-neutral-400">Chưa có đánh giá</span>
                )}
                <span className="text-[13px] text-neutral-500">
                  {totalStock > 0 ? product.variants.length + " biến thể" : "Tạm hết hàng"}
                </span>
              </div>
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
              sizeChart={sizeChartFor(product.category.slug)}
            />
          </div>
        </div>

        <section className="border-t-2 border-divider px-6 py-10">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-[20px]">Mô tả</h2>
              <p className="max-w-prose text-[15px] text-neutral-700">{product.description}</p>
            </div>

            <div>
              <h2 className="mb-3 text-[20px]">Thông tin</h2>
              <dl className="border-2 border-divider bg-surface">
                <Spec label="Chất liệu" value={product.material} />
                <Spec label="Bảo quản" value={product.careNote} />
                <Spec label="Thương hiệu" value={product.brand?.name ?? null} />
                <Spec label="Danh mục" value={product.category.name} />
                <Spec
                  label="Màu có sẵn"
                  value={[...new Set(product.variants.map((v) => v.color))].join(", ")}
                />
              </dl>
            </div>
          </div>
        </section>

        <ReviewSection
          reviews={product.reviews}
          breakdown={breakdown}
          ratingAvg={product.ratingAvg}
          ratingCount={product.ratingCount}
        />

        {related.length > 0 ? (
          <section className="border-t-2 border-divider px-6 py-10">
            <h2 className="mb-5 border-b-2 border-divider pb-3 text-[24px]">Sản phẩm tương tự</h2>
            <ProductGrid products={related} />
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </>
  );
}

function Spec({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-4 border-b border-hairline px-4 py-2.5 last:border-b-0">
      <dt className="w-32 shrink-0 text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-500">
        {label}
      </dt>
      <dd className="text-[14px]">{value}</dd>
    </div>
  );
}
