import Link from "next/link";
import { NewProductForm } from "@/components/admin/new-product-form";
import { requirePermission } from "@/server/admin/guard";
import { listPickers } from "@/server/admin/catalog-admin";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requirePermission("san-pham.sua");
  const { categories, brands } = await listPickers();

  return (
    <div>
      <Link
        href="/admin/san-pham"
        className="mb-3.5 inline-flex min-h-11 items-center text-[12.5px] font-extrabold text-accent"
      >
        ← QUAY LẠI DANH SÁCH SẢN PHẨM
      </Link>

      <div className="mb-6 border-b-2 border-border-soft pb-3.5">
        <h1 className="text-[26px] lg:text-[34px]">Thêm sản phẩm</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Tạo bản ghi trước, rồi thêm biến thể và ảnh ở màn sửa.
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="border-2 border-accent bg-accent-100 px-4 py-3 text-[13.5px] font-semibold text-accent-800">
          Chưa có danh mục nào.{" "}
          <Link href="/admin/danh-muc" className="underline">
            Tạo danh mục trước
          </Link>{" "}
          rồi quay lại đây.
        </p>
      ) : (
        <NewProductForm categories={categories} brands={brands} />
      )}
    </div>
  );
}
