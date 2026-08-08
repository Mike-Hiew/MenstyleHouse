import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { compareSizes, type CatalogQuery, type Facets, type Scope } from "@/lib/catalog";

/**
 * Toàn bộ truy vấn catalog. Component không gọi Prisma trực tiếp — quy ước dự
 * án trong `docs/CLAUDE-rules.md`.
 */

/* ── Dựng điều kiện WHERE ─────────────────────────────────── */

/**
 * Giá bán thực tế là `salePrice ?? basePrice`. Postgres tính được bằng COALESCE
 * nhưng Prisma không lọc trên biểu thức, nên tách thành hai nhánh OR.
 */
function priceBetween(min: number, max: number): Prisma.ProductWhereInput | null {
  if (!min && !max) return null;
  const bound: Prisma.IntFilter = {};
  if (min) bound.gte = min;
  if (max) bound.lte = max;
  return {
    OR: [{ salePrice: { not: null, ...bound } }, { salePrice: null, basePrice: bound }],
  };
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

  if (scope.skip !== "km" && q.km) and.push({ salePrice: { not: null } });

  if (scope.skip !== "gia") {
    const range = priceBetween(q["gia-tu"], q["gia-den"]);
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
});

export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export type ProductPage = {
  items: ProductCardData[];
  total: number;
  /** Số sản phẩm chưa hiện, để ghi lên nút "Tải thêm". */
  remaining: number;
};

/** Số lượng đã bán theo sản phẩm — `OrderItem` chỉ giữ `variantId` nên phải nối tay. */
async function soldByProduct(): Promise<Map<string, number>> {
  const [rows, variants] = await Promise.all([
    db.orderItem.groupBy({ by: ["variantId"], _sum: { qty: true } }),
    db.variant.findMany({ select: { id: true, productId: true } }),
  ]);
  const productOf = new Map(variants.map((v) => [v.id, v.productId]));
  const sold = new Map<string, number>();
  for (const r of rows) {
    const pid = productOf.get(r.variantId);
    if (!pid) continue;
    sold.set(pid, (sold.get(pid) ?? 0) + (r._sum.qty ?? 0));
  }
  return sold;
}

export async function listProducts(q: CatalogQuery, scope: Scope = {}): Promise<ProductPage> {
  const where = productWhere(q, scope);
  const total = await db.product.count({ where });
  const take = Math.min(q.xem, total);
  const sort = q["sap-xep"];

  // "Mới nhất" là thứ tự duy nhất Prisma sắp xếp thẳng được; ba kiểu còn lại
  // dựa trên giá thực tế (COALESCE) hoặc số đã bán nên phải xếp trong bộ nhớ.
  if (sort === "moi-nhat") {
    const items = await db.product.findMany({
      where,
      include: cardInclude,
      orderBy: [{ createdAt: "desc" }],
      take,
    });
    return { items, total, remaining: Math.max(0, total - items.length) };
  }

  const rows = await db.product.findMany({
    where,
    select: { id: true, basePrice: true, salePrice: true, createdAt: true },
  });
  const sold = sort === "ban-chay" ? await soldByProduct() : null;

  rows.sort((a, b) => {
    if (sold) {
      const diff = (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0);
      if (diff !== 0) return diff;
    } else {
      const pa = a.salePrice ?? a.basePrice;
      const pb = b.salePrice ?? b.basePrice;
      if (pa !== pb) return sort === "gia-tang" ? pa - pb : pb - pa;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const ids = rows.slice(0, take).map((r) => r.id);
  const found = await db.product.findMany({ where: { id: { in: ids } }, include: cardInclude });
  const byId = new Map(found.map((p) => [p.id, p]));
  const items = ids.map((id) => byId.get(id)).filter((p): p is ProductCardData => Boolean(p));

  return { items, total, remaining: Math.max(0, total - items.length) };
}

/** Hàng mới về cho trang chủ. */
export async function getLatestProducts(take = 4): Promise<ProductCardData[]> {
  return db.product.findMany({
    where: { status: "ACTIVE" },
    take,
    orderBy: { createdAt: "desc" },
    include: cardInclude,
  });
}

/* ── Số đếm bộ lọc ────────────────────────────────────────── */

/**
 * Mỗi chiều được đếm với tất cả bộ lọc khác *trừ chính nó*, nên số cạnh một ô
 * cho biết "có bao nhiêu sản phẩm mang giá trị này" thay vì luôn bằng 0 khi ô
 * bên cạnh đã được tick. `tests/catalog.test.ts` khoá bất biến này.
 */
export async function loadFacets(q: CatalogQuery, scope: Scope = {}): Promise<Facets> {
  const [catRows, brandRows, colorRows, sizeRows, saleCount, categories, brands, priced] =
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
      db.product.count({
        where: { AND: [productWhere(q, { ...scope, skip: "km" }), { salePrice: { not: null } }] },
      }),
      db.category.findMany({ orderBy: { sort: "asc" }, select: { id: true, name: true, slug: true } }),
      db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      db.product.findMany({
        where: scope.categorySlug
          ? { status: "ACTIVE", category: { slug: scope.categorySlug } }
          : { status: "ACTIVE" },
        select: { basePrice: true, salePrice: true },
      }),
    ]);

  const catCount = new Map(catRows.map((r) => [r.categoryId, r._count._all]));
  const brandCount = new Map(brandRows.map((r) => [r.brandId, r._count._all]));

  const colorCount = new Map<string, { count: number; hex: string }>();
  for (const r of colorRows) {
    const cur = colorCount.get(r.color);
    if (cur) cur.count += 1;
    else colorCount.set(r.color, { count: 1, hex: r.colorHex });
  }

  const sizeCount = new Map<string, number>();
  for (const r of sizeRows) sizeCount.set(r.size, (sizeCount.get(r.size) ?? 0) + 1);

  const prices = priced.map((p) => p.salePrice ?? p.basePrice);
  const floor = prices.length ? Math.min(...prices) : 0;
  const ceil = prices.length ? Math.max(...prices) : 0;

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
    sale: saleCount,
    priceFloor: Math.floor(floor / 10_000) * 10_000,
    priceCeil: Math.ceil(ceil / 10_000) * 10_000,
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

/** Gợi ý cùng danh mục, loại trừ chính nó. */
export async function getRelated(product: ProductDetail, take = 4): Promise<ProductCardData[]> {
  return db.product.findMany({
    where: { status: "ACTIVE", categoryId: product.categoryId, id: { not: product.id } },
    include: cardInclude,
    orderBy: { ratingAvg: "desc" },
    take,
  });
}
