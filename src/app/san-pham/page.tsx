import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
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
      <Header />
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
            crumbs={["TRANG CHỦ", query.q ? "TÌM KIẾM" : "SẢN PHẨM"]}
          />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
