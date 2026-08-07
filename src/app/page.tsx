import Link from "next/link";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/storefront/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatVnd } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await db.product.findMany({
    where: { status: "ACTIVE" },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { images: { orderBy: { sort: "asc" }, take: 1 }, category: true },
  });

  return (
    <>
      <SiteHeader />

      <main>
        <section className="grid grid-cols-12 border-b-2 border-divider">
          <div className="col-span-5 flex flex-col justify-center gap-6 border-r-2 border-divider px-10 py-20">
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
            <div className="flex gap-3">
              <Button size="lg">Mua ngay</Button>
              <Button size="lg" variant="secondary">
                Xem bảng size
              </Button>
            </div>
          </div>
          <div className="col-span-7 bg-neutral-200" />
        </section>

        <section className="px-6 py-10">
          <div className="mb-5 flex items-end justify-between border-b-2 border-divider pb-3">
            <h2 className="text-[24px]">Hàng mới về</h2>
            <Link href="/san-pham" className="text-[13px] font-bold uppercase tracking-[0.08em] hover:text-accent-700">
              Xem tất cả
            </Link>
          </div>

          {products.length === 0 ? (
            <p className="py-20 text-center text-neutral-500">
              Chưa có sản phẩm. Chạy <code className="font-mono">npm run db:seed</code> để nạp dữ liệu mẫu.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-px bg-divider">
              {products.map((p) => (
                <article key={p.id} className="bg-surface p-4">
                  <div className="mb-3 aspect-[3/4] bg-neutral-200 grayscale-photo">
                    {p.images[0] ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={p.images[0].url}
                        alt={p.images[0].alt}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-500">
                    {p.category.name}
                  </div>
                  <h3 className="mb-1.5 text-[15px] font-semibold">{p.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[14px] font-bold">
                      {formatVnd(p.salePrice ?? p.basePrice)}
                    </span>
                    {p.salePrice ? (
                      <>
                        <span className="font-mono text-[13px] text-neutral-400 line-through">
                          {formatVnd(p.basePrice)}
                        </span>
                        <Badge tone="warn">Sale</Badge>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
