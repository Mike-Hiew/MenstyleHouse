import Link from "next/link";
import type { Route } from "next";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { ProductCard, ProductGrid } from "@/components/storefront/product-card";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { Container } from "@/components/storefront/shell";
import { getLatestProducts } from "@/server/catalog";
import { getNavCategories } from "@/server/navigation";
import { getBestsellers, getFlashSale, getHomeReviews } from "@/server/home";
import { Photo } from "@/components/ui/photo";

export const dynamic = "force-dynamic";

/**
 * Trang chủ — cũng là trang **giới thiệu cửa hàng**.
 *
 * Mockup không có màn "Giới thiệu" riêng: `shopNav` của mockup ghi thẳng
 * `['Giới thiệu','home']`, tức mục ấy trỏ về chính trang chủ. Nên phần giới
 * thiệu nằm ở đây — bảy khối kể một mạch: cửa hàng bán gì (hero) → bán những
 * nhóm nào (danh mục) → hàng mới → đang có ưu đãi gì → cái gì bán chạy → khách
 * nói gì → để lại email.
 *
 * **Khối nào không có dữ liệu thì biến mất.** Trang chủ mới dựng, chưa có đơn
 * và chưa có đánh giá, thì thà ngắn còn hơn bày ra ba ô trống và một mã sale gõ
 * vào không ăn.
 */

const cta = "inline-flex items-center px-6 py-4 text-[14px] font-extrabold uppercase";

export default async function HomePage() {
  const [products, categories, banChay, loiKhach, sale] = await Promise.all([
    getLatestProducts(4),
    getNavCategories(),
    getBestsellers(4),
    getHomeReviews(3),
    getFlashSale(),
  ]);

  // Mockup dùng ảnh lookbook riêng; ở đây mượn ảnh sản phẩm mới nhất làm hero.
  const hero = products[0]?.images[0] ?? null;

  return (
    <>
      <Header />

      <main>
        <section className="grid border-b-2 border-divider lg:grid-cols-2">
          <Container className="max-w-[680px] px-8 py-16 lg:ml-auto lg:mr-0 lg:border-r-2 lg:border-border-soft">
            <p className="label-tech mb-4 font-bold text-accent-700">BST 01 — BASIC KHÔNG NHÀM</p>
            <h1 className="text-[52px] leading-[1.05]">
              Đồ nam
              <br />
              mặc mỗi ngày,
              <br />
              đứng form cả năm.
            </h1>
            <p className="mt-6 text-[15px] leading-[1.7] text-muted">
              Cotton 250gsm, đường may đôi, size S–XXL cho 45–90kg.
              <br />
              Đổi size miễn phí 15 ngày.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/san-pham" className={cta + " bg-accent text-bg hover:bg-accent-600"}>
                Mua bộ sưu tập
              </Link>
              <Link
                href={{ pathname: "/san-pham", query: "sap-xep=moi-nhat" }}
                className={cta + " border border-border-soft hover:bg-subtle"}
              >
                Hàng mới về
              </Link>
            </div>

            <dl className="mt-12 grid grid-cols-3 gap-4 border-t border-hairline pt-6">
              <Stat value="40+" label="mẫu đang bán" />
              <Stat value="4.8/5" label="từ 1.240 đánh giá" />
              <Stat value="2–4 ngày" label="giao toàn quốc" />
            </dl>
          </Container>

          <div className="relative min-h-[320px] bg-subtle">
            {hero ? (
              <Photo
                src={hero.url}
                alt={hero.alt}
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
              />
            ) : null}
            <span className="absolute bottom-0 left-0 bg-accent px-6 py-4 text-[13px] font-extrabold uppercase tracking-[0.04em] text-bg">
              Giảm đến 40% — tuần này
            </span>
          </div>
        </section>

        <nav aria-label="Danh mục" className="border-b-2 border-divider">
          <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
            {categories.map((c, i) => (
              <li key={c.slug} className="border-r border-hairline last:border-r-0">
                <Link
                  href={{ pathname: "/danh-muc/" + c.slug }}
                  className="block px-5 py-4 hover:bg-subtle"
                >
                  <span className="label-tech block font-bold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-1.5 block text-[14px]">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Container className="py-14">
          <div className="mb-6 flex items-end justify-between gap-4 border-b border-hairline pb-4">
            <h2 className="text-[28px]">Mới về tuần này</h2>
            <Link
              href={"/san-pham" as Route}
              className="flex min-h-11 items-center text-[13px] font-extrabold uppercase tracking-[0.08em] text-accent-700 lg:min-h-0"
            >
              Xem tất cả →
            </Link>
          </div>

          {products.length === 0 ? (
            <p className="py-16 text-center text-muted">
              Chưa có sản phẩm. Chạy <code className="font-mono">npm run db:seed</code> để nạp dữ liệu mẫu.
            </p>
          ) : (
            <ProductGrid products={products} />
          )}
        </Container>

        {sale ? (
          <Container className="pb-2">
            <div className="grid bg-accent text-bg lg:grid-cols-2">
              <div className="p-8 lg:p-12">
                {/* `label-tech` mặc định màu xám nhạt — trên nền đỏ nó thành
                    một vệt bùn không đọc được, nên phải đặt lại màu chữ. */}
                <p className="label-tech font-bold tracking-[0.14em] text-bg">
                  ĐANG CHẠY — {sale.phu.toUpperCase()}
                </p>
                <h2 className="mt-4 text-[32px] leading-[1.02] lg:text-[44px]">{sale.tieuDe}</h2>
                <p className="mt-3 text-[15px] opacity-90">
                  Nhập mã <strong className="font-mono">{sale.code}</strong> ở bước thanh toán.
                  {sale.conLai !== null ? ` Còn ${sale.conLai} lượt.` : null}
                </p>
                <Link
                  href={{ pathname: "/san-pham", query: "km=1" }}
                  className={cta + " mt-7 bg-bg text-text"}
                >
                  Xem hàng sale
                </Link>
              </div>

              {/* Ba ảnh sản phẩm đang bán, thay cho ảnh lookbook rời của mockup. */}
              <div className="grid grid-cols-3 gap-0.5 p-0.5 lg:pl-0">
                {products.slice(0, 3).map((p) =>
                  p.images[0] ? (
                    <div key={p.id} className="relative min-h-[120px] bg-accent-600">
                      <Photo src={p.images[0].url} alt={p.images[0].alt} sizes="17vw" />
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          </Container>
        ) : null}

        {banChay.length > 0 ? (
          <Container className="pt-12">
            <div className="mb-6 flex items-end justify-between gap-4 border-b-2 border-border-soft pb-3.5">
              <h2 className="text-[28px]">Bán chạy nhất</h2>
              <span className="label-tech font-bold text-neutral-400">30 NGÀY QUA</span>
            </div>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {banChay.map((b) => (
                <ProductCard
                  key={b.san_pham.id}
                  product={b.san_pham}
                  badge={`ĐÃ BÁN ${b.daBan}`}
                />
              ))}
            </div>
          </Container>
        ) : null}

        {loiKhach.length > 0 ? (
          <Container className="pt-12">
            <div className="border-t-2 border-border-soft pt-6">
              <h2 className="mb-6 text-[28px]">Khách mặc nói gì</h2>
              {/* Mockup: `gap:0` + kẻ trái ở lưới, kẻ phải ở từng ô. Để cả gap
                  lẫn border là thành hai vạch song song. */}
              <ul className="grid gap-0 border-l border-hairline md:grid-cols-3">
                {loiKhach.map((r) => (
                  <li key={r.id} className="border-r border-hairline p-6">
                    <p
                      className="font-mono text-[13px] font-bold tracking-[2px] text-accent"
                      aria-label={`${r.sao} trên 5 sao`}
                    >
                      {"★".repeat(r.sao)}
                      <span className="text-neutral-300">{"★".repeat(5 - r.sao)}</span>
                    </p>
                    <p className="my-3.5 text-[15px] leading-[1.6]">{r.noiDung}</p>
                    <p className="text-[13px] font-semibold">{r.ten}</p>
                    <p className="text-[12px] text-faint">{r.moTa}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        ) : null}

        <Container className="pt-12">
          <div className="grid items-center gap-6 bg-subtle p-8 lg:grid-cols-2 lg:gap-8 lg:p-10">
            <div>
              <h2 className="mb-2 text-[24px] lg:text-[28px]">Nhận tin sale trước 24 giờ</h2>
              <p className="text-[14px] text-muted">
                Một tuần một email. Không spam, huỷ bất cứ lúc nào.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block text-[22px] font-extrabold">{value}</span>
        <span className="mt-1 block text-[12.5px] text-muted">{label}</span>
      </dd>
    </div>
  );
}
