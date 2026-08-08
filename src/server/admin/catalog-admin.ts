import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildSku, isHexColor, nextProductCode, uniqueSlug } from "@/lib/slug";

/**
 * Tạo sản phẩm, quản lý biến thể, danh mục và thương hiệu.
 *
 * Luật xuyên suốt file này: **không chỗ nào đặt `Variant.stock`.** Biến thể mới
 * luôn bắt đầu ở 0 và hàng chỉ vào bằng phiếu nhập, đúng luật số 2 trong
 * `docs/CLAUDE-rules.md`. Cho phép khai tồn ban đầu ở form tạo sản phẩm là sinh
 * ra hàng trong kho mà sổ không có dòng nào giải thích nó ở đâu ra.
 *
 * Luật thứ hai: **thứ đã đi vào đơn hàng thì không xoá.** Đơn snapshot tên và
 * SKU, nhưng sổ kho thì trỏ thẳng `variantId`; xoá biến thể đã bán là làm mồ
 * côi lịch sử kho.
 */

export class DuplicateVariantError extends Error {
  constructor(color: string, size: string) {
    super(`Sản phẩm đã có biến thể ${color} · size ${size}.`);
    this.name = "DuplicateVariantError";
  }
}

export class VariantInUseError extends Error {
  constructor(sku: string, ly: string) {
    super(`Không xoá được ${sku}: ${ly}. Đổi trạng thái sản phẩm sang Lưu trữ nếu ngừng bán.`);
    this.name = "VariantInUseError";
  }
}

export class CategoryInUseError extends Error {
  constructor(ten: string, soSp: number) {
    super(`"${ten}" đang có ${soSp} sản phẩm nên chưa xoá được. Chuyển chúng sang danh mục khác trước.`);
    this.name = "CategoryInUseError";
  }
}

export class NameTakenError extends Error {
  constructor(ten: string) {
    super(`"${ten}" đã có rồi.`);
    this.name = "NameTakenError";
  }
}

/* ── Sản phẩm ─────────────────────────────────────────────── */

export type NewProduct = {
  name: string;
  categoryId: string;
  brandId: string | null;
  basePrice: number;
  description: string;
  material?: string | null;
  careNote?: string | null;
};

/**
 * Tạo sản phẩm ở trạng thái nháp, chưa có biến thể và chưa có ảnh.
 *
 * Nháp chứ không phải đang bán: sản phẩm không biến thể thì khách bấm vào chỉ
 * thấy một trang không mua được gì. Nhân viên thêm biến thể và ảnh xong mới
 * chuyển sang Đang bán.
 */
export async function createProduct(input: NewProduct) {
  return db.$transaction(async (tx) => {
    // Khoá theo tên bảng để hai người tạo cùng lúc không lấy trùng mã.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('product_code'))`;

    const daCo = await tx.product.findMany({ select: { code: true, slug: true } });
    const code = nextProductCode(daCo.map((p) => p.code));
    const slug = uniqueSlug(input.name, daCo.map((p) => p.slug));

    return tx.product.create({
      data: {
        code,
        name: input.name,
        slug,
        description: input.description,
        categoryId: input.categoryId,
        brandId: input.brandId,
        basePrice: input.basePrice,
        status: "DRAFT",
        material: input.material || null,
        careNote: input.careNote || null,
      },
      select: { id: true, code: true, slug: true },
    });
  });
}

/* ── Biến thể ─────────────────────────────────────────────── */

export type NewVariant = {
  productSlug: string;
  color: string;
  colorHex: string;
  size: string;
  priceDelta: number;
  lowStockAt: number;
};

/** Thêm một biến thể. Tồn bắt đầu từ 0 — xem đầu file. */
export async function addVariant(input: NewVariant) {
  const product = await db.product.findUnique({
    where: { slug: input.productSlug },
    select: { id: true, code: true },
  });
  if (!product) throw new Error("Không tìm thấy sản phẩm " + input.productSlug);

  const color = input.color.trim();
  const size = input.size.trim();
  const hex = isHexColor(input.colorHex) ? input.colorHex.trim().toLowerCase() : "#cccccc";

  const trung = await db.variant.findUnique({
    where: { productId_color_size: { productId: product.id, color, size } },
    select: { id: true },
  });
  if (trung) throw new DuplicateVariantError(color, size);

  /*
   * SKU dựng từ mã sản phẩm nên hai màu có ba ký tự đầu giống nhau ("Xanh rêu"
   * và "Xanh navy" đều ra XAN) sẽ đụng nhau. Thêm hậu tố số cho tới khi trống —
   * thà SKU xấu một chút còn hơn từ chối nhân viên nhập màu hợp lệ.
   */
  const goc = buildSku(product.code, color, size);
  let sku = goc;
  for (let i = 2; await db.variant.findUnique({ where: { sku }, select: { id: true } }); i++) {
    sku = `${goc}-${i}`;
  }

  return db.variant.create({
    data: {
      productId: product.id,
      sku,
      color,
      colorHex: hex,
      size,
      priceDelta: input.priceDelta,
      lowStockAt: input.lowStockAt,
      // stock cố tình không đặt: mặc định 0, chỉ đổi qua `moveStock`.
    },
    select: { id: true, sku: true },
  });
}

/** Sửa những thứ *không* phải tồn kho: chênh giá và ngưỡng cảnh báo sắp hết. */
export async function updateVariant(id: string, input: { priceDelta: number; lowStockAt: number }) {
  return db.variant.update({
    where: { id },
    data: { priceDelta: input.priceDelta, lowStockAt: input.lowStockAt },
    select: { id: true },
  });
}

/**
 * Xoá biến thể — chỉ khi nó chưa có lịch sử gì.
 *
 * Còn tồn, từng có dòng sổ kho, hay từng nằm trong một đơn: đều chặn. Xoá đi là
 * `InventoryMovement` mất chỗ trỏ về và bất biến `stock === Σ(movements.delta)`
 * không còn kiểm được nữa.
 */
export async function deleteVariant(id: string) {
  const v = await db.variant.findUnique({
    where: { id },
    select: {
      sku: true,
      stock: true,
      _count: { select: { movements: true, cartItems: true } },
    },
  });
  if (!v) return;

  const daBan = await db.orderItem.count({ where: { variantId: id } });

  if (v.stock !== 0) throw new VariantInUseError(v.sku, `còn ${v.stock} sản phẩm trong kho`);
  if (v._count.movements > 0) throw new VariantInUseError(v.sku, "đã có lịch sử kho");
  if (daBan > 0) throw new VariantInUseError(v.sku, "đã nằm trong đơn hàng");
  if (v._count.cartItems > 0) throw new VariantInUseError(v.sku, "đang nằm trong giỏ của khách");

  await db.variant.delete({ where: { id } });
}

/* ── Danh mục ─────────────────────────────────────────────── */

export async function listCategories() {
  return db.category.findMany({
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, sort: true, _count: { select: { products: true } } },
  });
}

export async function createCategory(name: string) {
  const ten = name.trim();
  const daCo = await db.category.findMany({ select: { name: true, slug: true } });
  if (daCo.some((c) => c.name.toLowerCase() === ten.toLowerCase())) throw new NameTakenError(ten);

  const last = await db.category.findFirst({ orderBy: { sort: "desc" }, select: { sort: true } });
  return db.category.create({
    data: { name: ten, slug: uniqueSlug(ten, daCo.map((c) => c.slug)), sort: (last?.sort ?? -1) + 1 },
    select: { id: true },
  });
}

/**
 * Đổi tên danh mục. **Không đổi slug** — slug đang nằm trong URL công khai
 * `/danh-muc/<slug>` và trong link khách đã lưu; đổi theo tên là làm chết link
 * cũ mà không ai biết.
 */
export async function renameCategory(id: string, name: string, sort: number) {
  const ten = name.trim();
  const trung = await db.category.findFirst({
    where: { id: { not: id }, name: { equals: ten, mode: "insensitive" } },
    select: { id: true },
  });
  if (trung) throw new NameTakenError(ten);

  return db.category.update({ where: { id }, data: { name: ten, sort }, select: { id: true } });
}

export async function deleteCategory(id: string) {
  const c = await db.category.findUnique({
    where: { id },
    select: { name: true, _count: { select: { products: true } } },
  });
  if (!c) return;
  if (c._count.products > 0) throw new CategoryInUseError(c.name, c._count.products);
  await db.category.delete({ where: { id } });
}

/* ── Thương hiệu ──────────────────────────────────────────── */

export async function listBrands() {
  return db.brand.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { products: true } } },
  });
}

export async function createBrand(name: string) {
  const ten = name.trim();
  try {
    return await db.brand.create({ data: { name: ten }, select: { id: true } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new NameTakenError(ten);
    }
    throw e;
  }
}

export async function deleteBrand(id: string) {
  const b = await db.brand.findUnique({
    where: { id },
    select: { name: true, _count: { select: { products: true } } },
  });
  if (!b) return;
  if (b._count.products > 0) throw new CategoryInUseError(b.name, b._count.products);
  await db.brand.delete({ where: { id } });
}

/** Danh mục và thương hiệu cho các ô chọn ở form sản phẩm. */
export async function listPickers() {
  const [categories, brands] = await Promise.all([
    db.category.findMany({ orderBy: { sort: "asc" }, select: { id: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories, brands };
}

/** Gợi ý màu và size cho form thêm biến thể, lấy từ chính dữ liệu đang có. */
export async function suggestVariantOptions(productSlug: string) {
  const [colors, sizes] = await Promise.all([
    db.variant.findMany({
      distinct: ["color"],
      orderBy: { color: "asc" },
      select: { color: true, colorHex: true },
    }),
    db.variant.findMany({
      where: { product: { slug: productSlug } },
      distinct: ["size"],
      select: { size: true },
    }),
  ]);

  // Size của chính danh mục này thì sát hơn; chưa có thì lấy dải phổ biến.
  const dungChung = ["S", "M", "L", "XL", "XXL"];
  return {
    colors,
    sizes: sizes.length > 0 ? [...new Set([...sizes.map((s) => s.size), ...dungChung])] : dungChung,
  };
}

export type CategoryRow = Awaited<ReturnType<typeof listCategories>>[number];
export type BrandRow = Awaited<ReturnType<typeof listBrands>>[number];
