import Link from "next/link";
import { Container, Crumbs } from "./shell";
import { CatalogBody } from "./catalog-body";
import { describeFilters, hasActiveFilters, type CatalogQuery, type Scope } from "@/lib/catalog";
import { listProducts, loadFacets } from "@/server/catalog";
import { formatVnd } from "@/lib/money";

/**
 * Khung danh sách sản phẩm dùng chung cho /san-pham và /danh-muc/[slug].
 * Server lo truy vấn, phần tương tác nằm trong `CatalogBody`.
 */
export async function CatalogView({
  query,
  scope,
  basePath,
  params,
  title,
  crumbs,
  categoryName,
}: {
  query: CatalogQuery;
  scope: Scope;
  basePath: string;
  params: URLSearchParams;
  title: string;
  crumbs: string[];
  categoryName?: string;
}) {
  const [page, facets] = await Promise.all([
    listProducts(query, scope),
    loadFacets(query, scope),
  ]);

  /*
   * "N sản phẩm · giá tối đa X" theo mockup (`resultText`). Câu này hiện **cả
   * khi chưa lọc gì**, với X là giá của sản phẩm đắt nhất — nó nói cho khách
   * biết thanh kéo đang ở đâu và kéo được tới đâu.
   *
   * `gia-tu` không còn ô nhập nào ngoài giao diện nhưng vẫn nhận qua URL, nên
   * vẫn phải nói đúng khi nó có mặt.
   */
  const from = query["gia-tu"];
  const to = query["gia-den"] || facets.priceCeil;
  const priceNote =
    facets.priceCeil === 0
      ? ""
      : from
        ? ` · ${formatVnd(from)} – ${formatVnd(to)}`
        : " · giá tối đa " + formatVnd(to);
  const resultText = page.total + " sản phẩm" + priceNote;

  return (
    <Container className="pb-16 pt-6">
      <Crumbs parts={crumbs} />

      <CatalogBody
        basePath={basePath}
        params={params.toString()}
        facets={facets}
        lockCategory={Boolean(scope.categorySlug)}
        items={page.items}
        total={page.total}
        remaining={page.remaining}
        shown={query.xem}
        title={title}
        resultText={resultText}
        empty={
          <EmptyState
            query={query}
            basePath={basePath}
            params={params}
            categoryName={categoryName}
          />
        }
      />
    </Container>
  );
}

function EmptyState({
  query,
  basePath,
  params,
  categoryName,
}: {
  query: CatalogQuery;
  basePath: string;
  params: URLSearchParams;
  categoryName?: string;
}) {
  const filtered = hasActiveFilters(query);
  const keep = new URLSearchParams();
  const q = params.get("q");
  if (q) keep.set("q", q);

  return (
    <div className="border border-dashed border-border-soft bg-subtle px-5 py-12 lg:px-8 lg:py-16">
      <h2 className="mb-2.5 text-[20px] lg:text-[22px]">
        {filtered ? "Chưa có sản phẩm nào khớp bộ lọc" : "Danh mục này chưa có sản phẩm"}
      </h2>
      <p className="mb-5 max-w-[420px] text-[14px] text-muted">
        {filtered
          ? "Thử bỏ bớt một điều kiện, hoặc nâng mức giá tối đa lên. Hiện bạn đang lọc: " +
            describeFilters(query, categoryName) +
            "."
          : "Hàng đang được nhập về. Bạn xem tạm các danh mục khác nhé."}
      </p>
      <Link
        href={{ pathname: filtered ? basePath : "/san-pham", query: keep.toString() }}
        className="inline-flex min-h-12 items-center bg-accent px-6 text-[14px] font-extrabold text-bg hover:bg-accent-600"
      >
        {filtered ? "XOÁ BỘ LỌC" : "XEM TẤT CẢ SẢN PHẨM"}
      </Link>
    </div>
  );
}
