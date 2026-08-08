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
    <article className="relative">
      <div className="relative aspect-[3/4] w-full bg-subtle">
        {image ? (
          <Photo src={image.url} alt={image.alt} sizes="(min-width: 1024px) 25vw, 50vw" />
        ) : null}

        {badge ? (
          <span className="absolute left-0 top-0 bg-neutral-900 px-2.5 py-2 font-mono text-[12px] font-bold leading-none text-bg">
            {badge}
          </span>
        ) : off !== null ? (
          <span className="absolute left-0 top-0 bg-accent px-2.5 py-2 font-mono text-[12px] font-bold leading-none text-bg">
            −{off}%
          </span>
        ) : null}

        {/* Không phải nút riêng: sản phẩm nhiều màu/size nên phải mở trang chi
            tiết để chọn. Cả thẻ là một liên kết nên bấm vào đây cũng mở đúng chỗ. */}
        <span className="absolute bottom-0 right-0 h-9 bg-neutral-900 px-3.5 text-[12px] font-extrabold leading-9 text-bg">
          + GIỎ
        </span>
      </div>

      <div className="pt-3.5">
        <div className="label-tech tracking-[0.08em] text-neutral-400">{product.category.name}</div>
        <h3 className="my-2 text-[14.5px] font-semibold leading-[1.35]">{product.name}</h3>
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-[15px] font-extrabold">{formatVnd(effectivePrice(product))}</span>
          {product.salePrice ? (
            <span className="text-[12.5px] text-neutral-400 line-through">
              {formatVnd(product.basePrice)}
            </span>
          ) : null}
        </div>
      </div>

      <Link
        href={{ pathname: "/san-pham/" + product.slug }}
        className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-accent"
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
    <div className="flex border border-border-soft lg:hidden" role="group" aria-label="Mật độ lưới">
      {([2, 1] as const).map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          aria-label={n === 2 ? "Hiện 2 cột" : "Hiện 1 cột"}
          onClick={() => onChange(n)}
          className={cn(
            "flex h-11 w-11 items-center justify-center",
            value === n ? "bg-neutral-900 text-bg" : "hover:bg-subtle",
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
