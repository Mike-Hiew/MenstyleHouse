import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
import { CatalogView } from "@/components/storefront/catalog-view";
import { CatalogSkeleton } from "@/components/storefront/catalog-skeleton";
import { parseCatalogQuery, serializeCatalogQuery, type RawSearchParams } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tất cả sản phẩm — Men Style House",
  description: "Áo phông, sơ mi, polo, hoodie, khoác, jeans, short và phụ kiện nam.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const query = parseCatalogQuery(await searchParams);
  const params = serializeCatalogQuery(query);

  return (
    <>
      <SiteHeader />
      <Breadcrumb
        items={[{ label: "Trang chủ", href: "/" }, { label: query.q ? "Tìm kiếm" : "Sản phẩm" }]}
      />
      <main>
        {/* Suspense đặt trong page chứ không dùng loading.tsx: loading.tsx bọc cả
            route nên response stream ngay, làm notFound() không đặt được status 404. */}
        <Suspense key={params.toString()} fallback={<CatalogSkeleton />}>
          <CatalogView
            query={query}
            scope={{}}
            basePath="/san-pham"
            params={params}
            title={query.q ? "Kết quả cho “" + query.q + "”" : "Tất cả sản phẩm"}
            subtitle={
              query.q
                ? undefined
                : "Lọc theo danh mục, giá, màu và size. Số cạnh mỗi ô là số sản phẩm mang thuộc tính đó, tính theo các nhóm lọc còn lại."
            }
          />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
