import Link from "next/link";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { ProductGrid } from "@/components/storefront/product-card";
import { getLatestProducts } from "@/server/catalog";
import { getNavCategories } from "@/server/navigation";

export const dynamic = "force-dynamic";

const cta =
  "inline-flex h-13 items-center px-5 text-[15px] font-semibold transition-colors";

export default async function HomePage() {
  const [products, categories] = await Promise.all([getLatestProducts(), getNavCategories()]);

  return (
    <>
      <SiteHeader />

      <main>
        <section className="grid grid-cols-12 border-b-2 border-divider">
          <div className="col-span-12 flex flex-col justify-center gap-6 border-divider px-10 py-20 lg:col-span-5 lg:border-r-2">
            <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-accent-700">
              Bộ sưu tập Thu 2026
            </span>
            <h1 className="text-[56px] leading-[0.95]">
              Quần áo nam
              <br />
              đúng dáng, đúng giá.
            </h1>
            <p className="max-w-md text-[15px] text-neutral-600">
              Chất liệu thật, số đo thật, đổi trả trong 15 ngày. Không cần đăng ký
              tài khoản mới mua được.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/san-pham" className={cta + " bg-accent text-white hover:bg-accent-600"}>
                Mua ngay
              </Link>
              <Link
                href={{ pathname: "/san-pham", query: "km=1" }}
                className={cta + " border-2 border-divider hover:bg-neutral-200"}
              >
                Đang giảm giá
              </Link>
            </div>
          </div>
          <div className="hidden bg-neutral-200 lg:col-span-7 lg:block" />
        </section>

        <nav aria-label="Danh mục nổi bật" className="border-b-2 border-divider">
          <ul className="flex flex-wrap gap-px bg-divider">
            {categories.map((c) => (
              <li key={c.slug} className="flex-1 bg-surface">
                <Link
                  href={{ pathname: "/danh-muc/" + c.slug }}
                  className="block whitespace-nowrap px-5 py-4 text-center text-[13px] font-bold uppercase tracking-[0.08em] hover:bg-neutral-200 hover:text-accent-700"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="px-6 py-10">
          <div className="mb-5 flex items-end justify-between border-b-2 border-divider pb-3">
            <h2 className="text-[24px]">Hàng mới về</h2>
            <Link
              href="/san-pham"
              className="text-[13px] font-bold uppercase tracking-[0.08em] hover:text-accent-700"
            >
              Xem tất cả
            </Link>
          </div>

          {products.length === 0 ? (
            <p className="py-20 text-center text-neutral-500">
              Chưa có sản phẩm. Chạy <code className="font-mono">npm run db:seed</code> để nạp dữ liệu mẫu.
            </p>
          ) : (
            <ProductGrid products={products} />
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
