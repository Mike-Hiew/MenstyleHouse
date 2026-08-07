import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./star-rating";
import { discountPercent, effectivePrice } from "@/lib/catalog";
import type { ProductCardData } from "@/server/catalog";
import { formatVnd } from "@/lib/money";

/** Màu hiển thị dưới thẻ — gộp theo tên vì mỗi màu có nhiều size. */
function swatches(variants: ProductCardData["variants"]) {
  const seen = new Map<string, string>();
  for (const v of variants) if (!seen.has(v.color)) seen.set(v.color, v.colorHex);
  return [...seen.entries()].map(([color, hex]) => ({ color, hex }));
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images[0];
  const price = effectivePrice(product);
  const off = discountPercent(product);
  const colors = swatches(product.variants);
  const inStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

  return (
    <article className="group flex flex-col bg-surface p-4">
      <Link
        href={{ pathname: "/san-pham/" + product.slug }}
        className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-accent"
      >
        <div className="relative mb-3 aspect-[3/4] bg-neutral-200 grayscale-photo">
          {image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={image.url}
              alt={image.alt}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : null}

          {off !== null ? (
            <span className="absolute left-0 top-0 bg-accent px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
              −{off}%
            </span>
          ) : null}

          {inStock === 0 ? (
            <span className="absolute inset-x-0 bottom-0 bg-neutral-900/85 px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-white">
              Tạm hết hàng
            </span>
          ) : null}
        </div>

        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-500">
          {product.category.name}
          {product.brand ? " · " + product.brand.name : ""}
        </div>

        <h3 className="mb-1.5 text-[15px] font-semibold group-hover:text-accent-700">
          {product.name}
        </h3>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <span className="font-mono text-[14px] font-bold">{formatVnd(price)}</span>
          {product.salePrice ? (
            <>
              <span className="font-mono text-[13px] text-neutral-400 line-through">
                {formatVnd(product.basePrice)}
              </span>
              <Badge tone="warn">Sale</Badge>
            </>
          ) : null}
        </div>
      </Link>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {product.ratingCount > 0 ? (
          <StarRating value={product.ratingAvg} count={product.ratingCount} size={13} />
        ) : (
          <span className="text-[12px] text-neutral-400">Chưa có đánh giá</span>
        )}

        <div className="flex items-center gap-1" aria-label={"Màu: " + colors.map((c) => c.color).join(", ")}>
          {colors.slice(0, 4).map((c) => (
            <span
              key={c.color}
              title={c.color}
              className="h-3 w-3 border border-hairline"
              style={{ background: c.hex }}
            />
          ))}
          {colors.length > 4 ? (
            <span className="font-mono text-[11px] text-neutral-500">+{colors.length - 4}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Lưới hairline: khe 1px để lộ nền divider, đúng quy tắc Modernist. */
export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-px bg-divider md:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
