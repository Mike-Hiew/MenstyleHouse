import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCategoryBySlug } from "@/server/navigation";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
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
      <SiteHeader />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Sản phẩm", href: "/san-pham" },
          { label: category.name },
        ]}
      />
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
          />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
