import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCategoryBySlug } from "@/server/navigation";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { CatalogView } from "@/components/storefront/catalog-view";
import { CatalogSkeleton } from "@/components/storefront/catalog-skeleton";
import { parseCatalogQuery, serializeCatalogQuery, type RawSearchParams } from "@/lib/catalog";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const category = await findCategoryBySlug((await params).slug);
  if (!category) return { title: "Không tìm thấy danh mục — Men Style House" };
  return {
    title: category.name + " nam — Men Style House",
    description: "Bộ sưu tập " + category.name.toLowerCase() + " nam, đủ màu và size.",
  };
}

export default async function CategoryPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const category = await findCategoryBySlug(slug);
  if (!category) notFound();

  const query = parseCatalogQuery(await searchParams);
  const urlParams = serializeCatalogQuery(query);
  const basePath = "/danh-muc/" + category.slug;

  return (
    <>
      <Header />
      <main>
        {/* Kiểm tra danh mục tồn tại xong mới stream — nếu bọc bằng loading.tsx
            thì response đã đi trước và notFound() không đặt được status 404. */}
        <Suspense key={urlParams.toString()} fallback={<CatalogSkeleton />}>
          <CatalogView
            query={query}
            scope={{ categorySlug: category.slug }}
            basePath={basePath}
            params={urlParams}
            title={category.name}
            crumbs={["TRANG CHỦ", "SẢN PHẨM", category.name.toUpperCase()]}
            categoryName={category.name}
          />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
