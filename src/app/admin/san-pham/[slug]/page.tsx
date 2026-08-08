import Link from "next/link";
import { requirePermission } from "@/server/admin/guard";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { ProductImages } from "@/components/admin/product-images";
import { VariantManager } from "@/components/admin/variant-manager";
import { getProductForAdmin } from "@/server/admin/products";
import { listPickers, suggestVariantOptions } from "@/server/admin/catalog-admin";
import { formatVnd } from "@/lib/money";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function AdminProductEditPage({ params }: Params) {
  await requirePermission("san-pham.sua");
  const { slug } = await params;
  const product = await getProductForAdmin(decodeURIComponent(slug));
  if (!product) notFound();

  const totalStock = product.variants.reduce((n, v) => n + v.stock, 0);
  const [goiY, pickers] = await Promise.all([
    suggestVariantOptions(product.slug),
    listPickers(),
  ]);

  return (
    <div>
      <Link
        href="/admin/san-pham"
        className="mb-3.5 inline-flex min-h-11 items-center text-[12.5px] font-extrabold text-accent"
      >
        ← QUAY LẠI DANH SÁCH SẢN PHẨM
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border-soft pb-3.5">
        <div>
          <h1 className="text-[26px] lg:text-[34px]">{product.name}</h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {/*
              Mã sản phẩm phải hiện ở đây: SKU của mọi biến thể dựng từ nó và nó
              được in lên tem, nên nhân viên hay phải đọc lại. Bản trước chỉ ghi
              "Sửa sản phẩm" và không in mã ở đâu cả.
            */}
            <span className="font-mono font-bold text-text">{product.code}</span> ·{" "}
            {product.category.name}
            {product.brand ? " · " + product.brand.name : ""} · {product.variants.length} biến thể ·
            tồn {totalStock}
          </p>
        </div>
        <Link
          href={("/san-pham/" + product.slug) as Route}
          className="flex min-h-11 items-center border border-border-soft px-4 text-[13px] font-extrabold"
        >
          Xem trên storefront
        </Link>
      </div>

      <div className="grid items-start gap-7 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          {/*
            `key` gắn theo dữ liệu mà form kia vừa đổi, để thông báo cũ không
            nằm lại sau khi vấn đề đã được giải quyết. Thêm biến thể xong mà màn
            hình vẫn treo câu "Sản phẩm chưa có biến thể nào" thì nhân viên đọc
            được hai câu mâu thuẫn nhau và không biết tin câu nào.
          */}
          <ProductEditForm
            key={"sp-" + product.variants.length}
            categories={pickers.categories}
            brands={pickers.brands}
            product={{
              slug: product.slug,
              name: product.name,
              description: product.description,
              basePrice: product.basePrice,
              salePrice: product.salePrice,
              status: product.status,
              material: product.material,
              careNote: product.careNote,
              code: product.code,
              seoTitle: product.seoTitle,
              seoDescription: product.seoDescription,
              categoryId: product.categoryId,
              brandId: product.brandId,
            }}
          />

          <VariantManager
            key={"bt-" + product.status}
            slug={product.slug}
            variants={product.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              color: v.color,
              colorHex: v.colorHex,
              size: v.size,
              stock: v.stock,
              lowStockAt: v.lowStockAt,
              priceDelta: v.priceDelta,
              khoaXoa: v.stock !== 0 || v._count.movements > 0 || v._count.cartItems > 0,
            }))}
            goiY={goiY}
          />

          <ProductImages
            slug={product.slug}
            images={product.images.map((i) => ({
              id: i.id,
              url: i.url,
              alt: i.alt,
              sort: i.sort,
              blobId: i.blobId,
            }))}
          />
        </div>

        <aside>
          <p className="mb-4 border border-dashed border-border-soft bg-subtle px-3.5 py-3 text-[12.5px] leading-[1.6] text-muted">
            Tồn kho <strong>không sửa được ở đây</strong>. Mọi thay đổi phải đi qua phiếu nhập hoặc
            phiếu điều chỉnh để luôn sinh bản ghi trong sổ kho.
          </p>

          <dl className="flex flex-col gap-2 border-t-2 border-border-soft pt-4 text-[13.5px]">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Giá đang bán</dt>
              <dd className="font-semibold">
                {formatVnd(product.salePrice ?? product.basePrice)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Đánh giá</dt>
              <dd className="font-semibold">
                {product.ratingCount > 0
                  ? product.ratingAvg.toFixed(1) + " · " + product.ratingCount + " lượt"
                  : "Chưa có"}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
