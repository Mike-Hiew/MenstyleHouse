"use client";

import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { saveProductAction, type AdminActionState } from "@/app/admin/actions";

/**
 * Sửa thông tin sản phẩm. Cố ý **không** có ô sửa tồn kho — tồn chỉ đổi qua
 * `lib/inventory.ts` bằng phiếu nhập/điều chỉnh (luật số 2).
 */
type Picker = { id: string; name: string };

export function ProductEditForm({
  product,
  categories,
  brands,
  bangSize,
}: {
  categories: Picker[];
  brands: Picker[];
  bangSize: { id: string; name: string }[];
  product: {
    slug: string;
    name: string;
    description: string;
    basePrice: number;
    salePrice: number | null;
    status: string;
    sizeChartId: string | null;
    material: string | null;
    careNote: string | null;
    code: string;
    seoTitle: string | null;
    seoDescription: string | null;
    categoryId: string;
    brandId: string | null;
  };
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    saveProductAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={product.slug} />

      {state.message ? (
        <p
          role="alert"
          className={cn(
            "border-2 px-4 py-3 text-[13.5px] font-semibold",
            state.ok ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <Row label="Mã sản phẩm" hint="Cố định — SKU của mọi biến thể dựng từ mã này">
        <input value={product.code} readOnly className={cn(input, "bg-subtle font-mono text-muted")} />
      </Row>

      <Row label="Tên sản phẩm">
        <input name="name" defaultValue={product.name} className={input} />
      </Row>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Danh mục">
          <select name="categoryId" defaultValue={product.categoryId} className={input}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Thương hiệu">
          <select name="brandId" defaultValue={product.brandId ?? ""} className={input}>
            <option value="">— Không đặt —</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Row>
      </div>

      <Row label="Mô tả sản phẩm">
        <textarea name="description" rows={5} defaultValue={product.description} className={input} />
      </Row>

      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="Giá gốc (₫)">
          <input
            name="basePrice"
            inputMode="numeric"
            defaultValue={product.basePrice}
            className={input}
          />
        </Row>
        <Row label="Giá sale (₫)" hint="Để trống nếu không giảm">
          <input
            name="salePrice"
            inputMode="numeric"
            defaultValue={product.salePrice ?? ""}
            className={input}
          />
        </Row>
        <Row label="Trạng thái">
          <select name="status" defaultValue={product.status} className={input}>
            <option value="DRAFT">Nháp</option>
            <option value="ACTIVE">Đang bán</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
        </Row>
        {/*
          Bỏ trống là theo danh mục — mặc định đúng cho gần hết sản phẩm. Chỉ
          chọn riêng khi một mẫu có số đo khác hẳn phần còn lại của danh mục.
        */}
        <Row label="Bảng size" hint="Để trống thì dùng bảng của danh mục">
          <select name="sizeChartId" defaultValue={product.sizeChartId ?? ""} className={input}>
            <option value="">— Theo danh mục —</option>
            {bangSize.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Row>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Chất liệu">
          <input name="material" defaultValue={product.material ?? ""} className={input} />
        </Row>
        <Row label="Hướng dẫn bảo quản">
          <input name="careNote" defaultValue={product.careNote ?? ""} className={input} />
        </Row>
      </div>

      {/* Khối SEO đúng mockup `aProductEdit`. */}
      <fieldset className="border border-border-soft p-4">
        <legend className="label-tech px-1.5 font-bold">SEO</legend>
        <div className="flex flex-col gap-4">
          <Row label="Tiêu đề SEO" hint="Để trống thì dùng tên sản phẩm">
            <input
              name="seoTitle"
              maxLength={70}
              defaultValue={product.seoTitle ?? ""}
              placeholder={product.name}
              className={input}
            />
          </Row>
          <Row label="Mô tả SEO" hint="Google cắt quanh 160 ký tự">
            <textarea
              name="seoDescription"
              rows={2}
              maxLength={200}
              defaultValue={product.seoDescription ?? ""}
              placeholder={product.description.slice(0, 120)}
              className={input}
            />
          </Row>
        </div>
      </fieldset>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 bg-accent px-7 text-[14px] font-extrabold text-bg disabled:opacity-60"
        >
          {pending ? "Đang lưu…" : "LƯU THAY ĐỔI"}
        </button>
      </div>
    </form>
  );
}

const input =
  "w-full border border-border-soft bg-bg px-3.5 py-3 text-[16px] outline-none focus:border-accent lg:text-[14px]";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-faint">{hint}</span> : null}
    </label>
  );
}
