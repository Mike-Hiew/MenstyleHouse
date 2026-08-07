import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { ProductGrid } from "./product-card";
import { Pagination } from "./pagination";
import { ActiveFilterChips, FilterDialogButton, FilterSidebar, SortSelect } from "./catalog-filters";
import {
  countActiveFilters,
  hasActiveFilters,
  type CatalogQuery,
  type Scope,
} from "@/lib/catalog";
import { listProducts, loadFacets } from "@/server/catalog";
import { clearFilters } from "@/lib/search-params";

/**
 * Khung danh sách sản phẩm dùng chung cho /san-pham, /danh-muc/[slug] và
 * /tim-kiem. Chỉ khác nhau ở `scope` và phần tiêu đề.
 */
export async function CatalogView({
  query,
  scope,
  basePath,
  params,
  title,
  subtitle,
}: {
  query: CatalogQuery;
  scope: Scope;
  basePath: string;
  params: URLSearchParams;
  title: string;
  subtitle?: string;
}) {
  const [page, facets] = await Promise.all([listProducts(query, scope), loadFacets(query, scope)]);

  const shared = {
    basePath,
    params: params.toString(),
    facets,
    lockCategory: Boolean(scope.categorySlug),
  };
  const filtered = hasActiveFilters(query);

  return (
    <div className="px-6 py-8">
      <header className="mb-6 border-b-2 border-divider pb-4">
        <h1 className="text-[32px] leading-tight">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-[14px] text-neutral-600">{subtitle}</p> : null}
      </header>

      <div className="flex gap-8">
        <FilterSidebar {...shared} />

        <section className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
            <div className="flex items-center gap-3">
              <FilterDialogButton {...shared} activeCount={countActiveFilters(query)} />
              <p className="text-[13px] text-neutral-600">
                <strong className="font-mono text-text">{page.total}</strong> sản phẩm
                {page.pages > 1 ? (
                  <span className="text-neutral-500">
                    {" "}
                    · trang {page.page}/{page.pages}
                  </span>
                ) : null}
              </p>
            </div>
            <SortSelect basePath={basePath} params={params.toString()} />
          </div>

          <ActiveFilterChips {...shared} />

          {page.items.length > 0 ? (
            <>
              <ProductGrid products={page.items} />
              <Pagination
                page={page.page}
                pages={page.pages}
                basePath={basePath}
                params={params}
              />
            </>
          ) : (
            <EmptyState filtered={filtered} basePath={basePath} params={params} />
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState({
  filtered,
  basePath,
  params,
}: {
  filtered: boolean;
  basePath: string;
  params: URLSearchParams;
}) {
  const reset = clearFilters(params).toString();

  return (
    <div className="flex flex-col items-center gap-4 border-2 border-divider bg-surface px-6 py-24 text-center">
      <PackageSearch size={40} className="text-neutral-400" aria-hidden />
      <h2 className="text-[20px]">
        {filtered ? "Không có sản phẩm nào khớp bộ lọc" : "Danh mục này chưa có sản phẩm"}
      </h2>
      <p className="max-w-md text-[14px] text-neutral-600">
        {filtered
          ? "Thử bỏ bớt một vài điều kiện, hoặc xem toàn bộ catalog."
          : "Hàng đang được nhập về. Bạn xem tạm các danh mục khác nhé."}
      </p>
      <div className="flex flex-wrap justify-center gap-3 pt-1">
        {filtered ? (
          <Link
            href={{ pathname: basePath, query: reset }}
            className="inline-flex h-11 items-center border-2 border-divider px-4 text-[14px] font-semibold hover:bg-neutral-200"
          >
            Xoá bộ lọc
          </Link>
        ) : null}
        <Link
          href="/san-pham"
          className="inline-flex h-11 items-center bg-accent px-4 text-[14px] font-semibold text-white hover:bg-accent-600"
        >
          Xem tất cả sản phẩm
        </Link>
      </div>
    </div>
  );
}
