import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  compareSizes,
  PER_PAGE,
  PRICE_BUCKETS,
  type CatalogQuery,
  type Facets,
  type Scope,
} from "@/lib/catalog";

/**
 * Toàn bộ truy vấn catalog. Component không gọi Prisma trực tiếp — quy ước dự
 * án trong `docs/CLAUDE-rules.md`.
 */

/* ── Dựng điều kiện WHERE ─────────────────────────────────── */

/**
 * Giá bán thực tế là `salePrice ?? basePrice`. Postgres tính được bằng COALESCE
 * nhưng Prisma không lọc trên biểu thức, nên tách thành hai nhánh OR.
 */
function priceBetween(min: number, max: number | null): Prisma.ProductWhereInput {
  const bound = max === null ? { gte: min } : { gte: min, lte: max };
  return {
    OR: [{ salePrice: { not: null, ...bound } }, { salePrice: null, basePrice: bound }],
  };
}

function bucketWhere(keys: readonly string[]): Prisma.ProductWhereInput | null {
  const chosen = PRICE_BUCKETS.filter((b) => keys.includes(b.key));
  if (chosen.length === 0) return null;
  return { OR: chosen.map((b) => priceBetween(b.min, b.max)) };
}

export function productWhere(q: CatalogQuery, scope: Scope = {}): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ status: "ACTIVE" }];

  if (scope.categorySlug) {
    and.push({ category: { slug: scope.categorySlug } });
  } else if (scope.skip !== "danh-muc" && q["danh-muc"].length) {
    and.push({ category: { slug: { in: q["danh-muc"] } } });
  }

  if (scope.skip !== "thuong-hieu" && q["thuong-hieu"].length) {
    and.push({ brand: { name: { in: q["thuong-hieu"] } } });
  }

  // Màu và size nằm ở biến thể: sản phẩm khớp khi có ít nhất một biến thể khớp.
  if (scope.skip !== "mau" && q.mau.length) {
    and.push({ variants: { some: { color: { in: q.mau } } } });
  }

  if (scope.skip !== "size" && q.size.length) {
    and.push({ variants: { some: { size: { in: q.size } } } });
  }

  if (scope.skip !== "km" && q.km) {
    and.push({ salePrice: { not: null } });
  }

  if (scope.skip !== "gia") {
    const range = bucketWhere(q.gia);
    if (range) and.push(range);
  }

  if (q.q) {
    and.push({
      OR: [
        { name: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
        { brand: { name: { contains: q.q, mode: "insensitive" } } },
        { category: { name: { contains: q.q, mode: "insensitive" } } },
      ],
    });
  }

  return { AND: and };
}

/* ── Danh sách sản phẩm ───────────────────────────────────── */

export const cardInclude = Prisma.validator<Prisma.ProductInclude>()({
  images: { orderBy: { sort: "asc" }, take: 1 },
  category: { select: { name: true, slug: true } },
  brand: { select: { name: true } },
  variants: { select: { color: true, colorHex: true, stock: true } },
});

export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export type ProductPage = {
  items: ProductCardData[];
  total: number;
  page: number;
  pages: number;
};

export async function listProducts(q: CatalogQuery, scope: Scope = {}): Promise<ProductPage> {
  const where = productWhere(q, scope);
  const total = await db.product.count({ where });
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(q.trang, pages);
  const skip = (page - 1) * PER_PAGE;
  const sort = q["sap-xep"];

  if (sort === "gia-tang" || sort === "gia-giam") {
    // Không sắp xếp được theo COALESCE trong Prisma. Lấy 3 cột giá của toàn bộ
    // kết quả rồi cắt trang trong bộ nhớ — giữ WHERE làm nguồn sự thật duy nhất.
    const rows = await db.product.findMany({
      where,
      select: { id: true, basePrice: true, salePrice: true, createdAt: true },
    });
    rows.sort((a, b) => {
      const pa = a.salePrice ?? a.basePrice;
      const pb = b.salePrice ?? b.basePrice;
      if (pa !== pb) return sort === "gia-tang" ? pa - pb : pb - pa;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    const ids = rows.slice(skip, skip + PER_PAGE).map((r) => r.id);
    const found = await db.product.findMany({ where: { id: { in: ids } }, include: cardInclude });
    const byId = new Map(found.map((p) => [p.id, p]));
    const items = ids.map((id) => byId.get(id)).filter((p): p is ProductCardData => Boolean(p));
    return { items, total, page, pages };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === "danh-gia"
      ? [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  const items = await db.product.findMany({
    where,
    include: cardInclude,
    orderBy,
    skip,
    take: PER_PAGE,
  });

  return { items, total, page, pages };
}

/** Hàng mới về cho trang chủ. */
export async function getLatestProducts(take = 8): Promise<ProductCardData[]> {
  return db.product.findMany({
    where: { status: "ACTIVE" },
    take,
    orderBy: { createdAt: "desc" },
    include: cardInclude,
  });
}

/* ── Số đếm bộ lọc ────────────────────────────────────────── */

/**
 * Mỗi chiều được đếm với tất cả bộ lọc khác *trừ chính nó*, nên số đếm cho biết
 * "có bao nhiêu sản phẩm mang giá trị này" thay vì luôn bằng 0 khi ô bên cạnh
 * đã được tick. Bất biến này được khoá bởi `tests/catalog-facets.test.ts`.
 */
export async function loadFacets(q: CatalogQuery, scope: Scope = {}): Promise<Facets> {
  const [categoryRows, brandRows, colorRows, sizeRows, priceCounts, saleCount, categories, brands] =
    await Promise.all([
      db.product.groupBy({
        by: ["categoryId"],
        where: productWhere(q, { ...scope, skip: "danh-muc" }),
        _count: { _all: true },
      }),
      db.product.groupBy({
        by: ["brandId"],
        where: productWhere(q, { ...scope, skip: "thuong-hieu" }),
        _count: { _all: true },
      }),
      db.variant.findMany({
        where: { product: productWhere(q, { ...scope, skip: "mau" }) },
        select: { color: true, colorHex: true, productId: true },
        distinct: ["color", "productId"],
      }),
      db.variant.findMany({
        where: { product: productWhere(q, { ...scope, skip: "size" }) },
        select: { size: true, productId: true },
        distinct: ["size", "productId"],
      }),
      Promise.all(
        PRICE_BUCKETS.map((b) =>
          db.product.count({
            where: { AND: [productWhere(q, { ...scope, skip: "gia" }), priceBetween(b.min, b.max)] },
          }),
        ),
      ),
      db.product.count({
        where: { AND: [productWhere(q, { ...scope, skip: "km" }), { salePrice: { not: null } }] },
      }),
      db.category.findMany({ orderBy: { sort: "asc" }, select: { id: true, name: true, slug: true } }),
      db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);

  const catCount = new Map(categoryRows.map((r) => [r.categoryId, r._count._all]));
  const brandCount = new Map(brandRows.map((r) => [r.brandId, r._count._all]));

  const colorCount = new Map<string, { count: number; hex: string }>();
  for (const r of colorRows) {
    const cur = colorCount.get(r.color);
    if (cur) cur.count += 1;
    else colorCount.set(r.color, { count: 1, hex: r.colorHex });
  }

  const sizeCount = new Map<string, number>();
  for (const r of sizeRows) sizeCount.set(r.size, (sizeCount.get(r.size) ?? 0) + 1);

  return {
    categories: categories.map((c) => ({
      value: c.slug,
      label: c.name,
      count: catCount.get(c.id) ?? 0,
    })),
    brands: brands.map((b) => ({
      value: b.name,
      label: b.name,
      count: brandCount.get(b.id) ?? 0,
    })),
    colors: [...colorCount.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0], "vi"))
      .map(([color, v]) => ({ value: color, label: color, count: v.count, hex: v.hex })),
    sizes: [...sizeCount.entries()]
      .sort((a, b) => compareSizes(a[0], b[0]))
      .map(([size, count]) => ({ value: size, label: size, count })),
    prices: PRICE_BUCKETS.map((b, i) => ({
      value: b.key,
      label: b.label,
      count: priceCounts[i],
    })),
    sale: saleCount,
  };
}

/* ── Chi tiết sản phẩm ────────────────────────────────────── */

export const detailInclude = Prisma.validator<Prisma.ProductInclude>()({
  images: { orderBy: { sort: "asc" } },
  category: { select: { name: true, slug: true } },
  brand: { select: { name: true } },
  variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
  reviews: { where: { approved: true }, orderBy: { createdAt: "desc" }, take: 20 },
});

export type ProductDetail = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  return db.product.findFirst({ where: { slug, status: "ACTIVE" }, include: detailInclude });
}

/** Phân bố sao — đếm trên toàn bộ đánh giá đã duyệt, không chỉ 20 cái mới nhất. */
export async function getRatingBreakdown(productId: string) {
  const rows = await db.review.groupBy({
    by: ["rating"],
    where: { productId, approved: true },
    _count: { _all: true },
  });
  const byStar = new Map(rows.map((r) => [r.rating, r._count._all]));
  return [5, 4, 3, 2, 1].map((star) => ({ star, count: byStar.get(star) ?? 0 }));
}

/** Gợi ý cùng danh mục, loại trừ chính nó. */
export async function getRelated(product: ProductDetail, take = 4): Promise<ProductCardData[]> {
  return db.product.findMany({
    where: { status: "ACTIVE", categoryId: product.categoryId, id: { not: product.id } },
    include: cardInclude,
    orderBy: { ratingAvg: "desc" },
    take,
  });
}
