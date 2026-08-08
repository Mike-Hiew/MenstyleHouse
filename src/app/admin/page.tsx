import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/cn";
import { deltaPercent, loadDashboard } from "@/server/admin/dashboard";
import { formatVnd } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const data = await loadDashboard(30);
  const peak = Math.max(1, ...data.monthly.map((m) => m.value));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border-soft pb-3.5">
        <div>
          <h1 className="text-[26px] lg:text-[34px]">Tổng quan</h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            Số liệu {data.days} ngày gần nhất, so với kỳ trước.
          </p>
        </div>
      </div>

      <dl className="mb-7 grid grid-cols-1 border-b-2 border-t-2 border-border-soft sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k, i) => {
          const delta = deltaPercent(k.value, k.prev);
          return (
            <div
              key={k.label}
              className={cn(
                "py-5 pr-6",
                i < data.kpis.length - 1 && "border-b border-hairline xl:border-b-0 xl:border-r",
              )}
            >
              <dt className="label-tech font-bold">{k.label}</dt>
              <dd>
                <span className="mb-1.5 mt-2.5 block text-[26px] font-extrabold tracking-[-0.025em] lg:text-[30px]">
                  {k.money ? formatVnd(k.value) : k.value}
                </span>
                <span className="block text-[12.5px] font-extrabold">
                  {delta === null ? (
                    <span className="text-faint">Chưa có kỳ trước để so</span>
                  ) : (
                    <>
                      <span className={delta >= 0 ? "text-text" : "text-accent-700"}>
                        {delta >= 0 ? "+" : ""}
                        {delta}%
                      </span>{" "}
                      <span className="font-normal text-faint">so với kỳ trước</span>
                    </>
                  )}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="mb-7 grid gap-7 xl:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="mb-4 text-[20px]">Doanh thu 6 tháng gần nhất</h2>
          <div className="flex h-[220px] items-end gap-3.5 border-b-2 border-border-soft">
            {data.monthly.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                <span className="font-mono text-[10px] text-faint">
                  {m.value > 0 ? Math.round(m.value / 1_000_000) + "tr" : "—"}
                </span>
                <div
                  className="w-full bg-accent"
                  style={{ height: Math.max(2, (m.value / peak) * 170) }}
                  aria-hidden
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3.5 pt-2">
            {data.monthly.map((m) => (
              <span key={m.label} className="label-tech flex-1 text-center">
                {m.label}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-[20px]">Top sản phẩm bán chạy</h2>
          {data.top.length === 0 ? (
            <p className="text-[13.5px] text-muted">Chưa có đơn nào để xếp hạng.</p>
          ) : (
            <ol className="border-t border-hairline">
              {data.top.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3 border-b border-hairline py-3">
                  <span className="label-tech w-5 flex-none">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">{p.name}</span>
                  <span className="flex-none font-mono text-[12px] text-faint">{p.qty} cái</span>
                  <span className="flex-none text-[13px] font-extrabold">
                    {formatVnd(p.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-4 text-[20px]">Cảnh báo sắp hết hàng</h2>
        {data.lowStock.length === 0 ? (
          <p className="text-[13.5px] text-muted">Không có SKU nào dưới ngưỡng cảnh báo.</p>
        ) : (
          <ul className="grid gap-px bg-hairline sm:grid-cols-2 xl:grid-cols-4">
            {data.lowStock.map((v) => (
              <li key={v.id} className="bg-bg p-3.5">
                <Link
                  href={("/san-pham/" + v.product.slug) as Route}
                  className="block text-[13.5px] font-semibold hover:text-accent-700"
                >
                  {v.product.name}
                </Link>
                <p className="label-tech mt-1">
                  {v.sku} · {v.color} · SIZE {v.size}
                </p>
                <p
                  className={cn(
                    "mt-2 text-[13px] font-extrabold",
                    v.stock === 0 ? "text-accent-700" : "text-text",
                  )}
                >
                  {v.stock === 0 ? "Hết hàng" : "Còn " + v.stock + " cái"}
                  <span className="ml-1 font-normal text-faint">/ ngưỡng {v.lowStockAt}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
