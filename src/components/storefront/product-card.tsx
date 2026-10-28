"use client";

import * as React from "react";
import Link from "next/link";
import { Columns2, Square } from "lucide-react";
import { cn } from "@/lib/cn";
import { Photo } from "@/components/ui/photo";
import { discountPercent, effectivePrice } from "@/lib/catalog";
import type { ProductCardData } from "@/server/catalog";
import { formatVnd } from "@/lib/money";

/**
 * Thẻ sản phẩm: ảnh 3/4 nền khối phụ, nhãn giảm giá góc trái trên, nút thêm
 * nhanh góc phải dưới.
 *
 * **Thẻ không có nền riêng và không thụt lề hai bên**, đúng mockup:
 * `<div style="padding:14px 0 0">` — chữ nằm thẳng hàng với mép ảnh, trên nền
 * trang. Bản trước bọc thẻ trong `bg-surface` rồi kẻ chỉ 1px giữa các ô; nhìn
 * thì vẫn "Modernist" nhưng không phải cái mockup vẽ: mọi lưới sản phẩm trong
 * mockup đều là `grid-template-columns:repeat(4,1fr);gap:24px`.
 */
export function ProductCard({
  product,
  badge,
}: {
  product: ProductCardData;
  /**
   * Nhãn góc trái trên, thay cho nhãn giảm giá (mockup dùng ô này cho số "đã
   * bán" ở khối Bán chạy nhất). Chỉ một nhãn ở một góc — chồng hai cái lên nhau
   * là không đọc được cái nào.
   */
  badge?: string;
}) {
  const image = product.images[0];
  const off = discountPercent(product);

  return (
    <article className="group relative">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card bg-subtle transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-soft)] group-hover:-translate-y-1.5 group-hover:shadow-raised">
        {image ? (
          <Photo src={image.url} alt={image.alt} sizes="(min-width: 1024px) 25vw, 50vw" />
        ) : null}

        {badge ? (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-surface/80 px-3 py-1.5 text-[12px] font-semibold leading-none text-text backdrop-blur-md">
            {badge}
          </span>
        ) : off !== null ? (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold leading-none text-bg">
            −{off}%
          </span>
        ) : null}

        {/* Không phải nút riêng: sản phẩm nhiều màu/size nên phải mở trang chi
            tiết để chọn. Cả thẻ là một liên kết nên bấm vào đây cũng mở đúng chỗ. */}
        <span className="absolute bottom-3 right-3 h-9 rounded-full bg-surface/80 px-4 text-[12px] font-semibold leading-9 text-text backdrop-blur-md">
          + Giỏ
        </span>
      </div>

      <div className="px-1 pt-3.5">
        <div className="text-[12px] font-medium text-muted">{product.category.name}</div>
        <h3 className="my-1.5 text-[15px] font-semibold leading-[1.35]">{product.name}</h3>
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className={cn("text-[15px] font-semibold", product.salePrice && "text-accent")}>
            {formatVnd(effectivePrice(product))}
          </span>
          {product.salePrice ? (
            <span className="text-[13px] text-muted line-through">
              {formatVnd(product.basePrice)}
            </span>
          ) : null}
        </div>
      </div>

      <Link
        href={{ pathname: "/san-pham/" + product.slug }}
        className="absolute inset-0 rounded-card focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="sr-only">{product.name}</span>
      </Link>
    </article>
  );
}

const STORAGE_KEY = "msh:grid";

/**
 * Mật độ lưới trên mobile do khách chọn, lưu ở localStorage. Đọc trong effect
 * để server và lần render đầu ở client cho ra cùng một cây DOM.
 */
export function GridDensityToggle({
  value,
  onChange,
}: {
  value: 1 | 2;
  onChange: (v: 1 | 2) => void;
}) {
  return (
    <div className="flex lg:hidden rounded-full bg-field p-1" role="group" aria-label="Mật độ lưới">
      {([2, 1] as const).map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          aria-label={n === 2 ? "Hiện 2 cột" : "Hiện 1 cột"}
          onClick={() => onChange(n)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            value === n ? "bg-neutral-900 text-bg" : "hover:bg-field-hover",
          )}
        >
          {n === 2 ? <Columns2 size={17} /> : <Square size={17} />}
        </button>
      ))}
    </div>
  );
}

export function useGridDensity() {
  const [density, setDensity] = React.useState<1 | 2>(2);

  React.useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "1" || saved === "2") setDensity(Number(saved) as 1 | 2);
  }, []);

  const change = React.useCallback((v: 1 | 2) => {
    setDensity(v);
    window.localStorage.setItem(STORAGE_KEY, String(v));
  }, []);

  return [density, change] as const;
}

export function ProductGrid({
  products,
  density = 2,
}: {
  products: ProductCardData[];
  density?: 1 | 2;
}) {
  return (
    // `gap-6` = 24px, đúng con số mockup dùng ở **cả bốn** lưới sản phẩm
    // (hàng mới, danh sách, bán chạy, sản phẩm liên quan).
    <div
      className={cn(
        "grid gap-6 md:grid-cols-3 lg:grid-cols-4",
        density === 2 ? "grid-cols-2" : "grid-cols-1",
      )}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
