import { afterEach, describe, expect, it } from "vitest";
import {
  addVariant,
  CategoryInUseError,
  createBrand,
  createCategory,
  createProduct,
  deleteBrand,
  deleteCategory,
  deleteVariant,
  DuplicateVariantError,
  NameTakenError,
  renameCategory,
  VariantInUseError,
} from "../src/server/admin/catalog-admin";
import { moveStock } from "../src/lib/inventory";
import { db } from "../src/lib/db";

/**
 * Nghiệm thu M3.5.
 *
 * Bài quan trọng nhất ở đây là **biến thể mới luôn có tồn 0**. Cho phép khai
 * tồn ban đầu là sinh ra hàng trong kho mà sổ không có dòng nào giải thích nó
 * ở đâu ra — phá thẳng luật số 2 và làm bất biến `stock === Σ(movements.delta)`
 * sai vĩnh viễn.
 */

const rac = { products: [] as string[], categories: [] as string[], brands: [] as string[] };

/**
 * Dọn dữ liệu kiểm thử.
 *
 * Ở đây **được phép** xoá `InventoryMovement`, khác với `tests/payments.test.ts`:
 * biến thể mang những dòng sổ đó cũng biến mất trong cùng lượt dọn, nên không
 * còn hàng nào để bất biến `stock === Σ(movements.delta)` phải khớp. Cái sai là
 * xoá dòng sổ mà *giữ lại* biến thể — lúc đó tồn và sổ lệch nhau vĩnh viễn.
 */
afterEach(async () => {
  const bienThe = await db.variant.findMany({
    where: { productId: { in: rac.products } },
    select: { id: true },
  });
  await db.inventoryMovement.deleteMany({
    where: { variantId: { in: bienThe.map((v) => v.id) } },
  });
  await db.variant.deleteMany({ where: { productId: { in: rac.products } } });
  await db.product.deleteMany({ where: { id: { in: rac.products } } });
  await db.category.deleteMany({ where: { id: { in: rac.categories } } });
  await db.brand.deleteMany({ where: { id: { in: rac.brands } } });
  rac.products.length = 0;
  rac.categories.length = 0;
  rac.brands.length = 0;
});

async function sanPhamMoi(name = "Áo thun kiểm thử") {
  const cat = await db.category.findFirstOrThrow({ select: { id: true } });
  const p = await createProduct({
    name,
    categoryId: cat.id,
    brandId: null,
    basePrice: 390_000,
    description: "Mô tả đủ dài cho bài kiểm thử này.",
  });
  rac.products.push(p.id);
  return p;
}

describe("tạo sản phẩm", () => {
  it("cấp mã tiếp theo dãy, slug từ tên, và để ở trạng thái nháp", async () => {
    const truoc = await db.product.findMany({ select: { code: true } });
    const p = await sanPhamMoi("Áo khoác gió kiểm thử");

    expect(p.code).toMatch(/^MSH-\d+$/);
    expect(truoc.map((x) => x.code)).not.toContain(p.code);
    expect(p.slug).toBe("ao-khoac-gio-kiem-thu");

    const db2 = await db.product.findUniqueOrThrow({
      where: { id: p.id },
      select: { status: true, variants: true, images: true },
    });
    // Nháp: chưa có biến thể thì khách bấm vào không mua được gì.
    expect(db2.status).toBe("DRAFT");
    expect(db2.variants).toHaveLength(0);
  });

  it("trùng tên thì slug tự thêm số, không đâm ràng buộc", async () => {
    const a = await sanPhamMoi("Áo nỉ trùng tên");
    const b = await sanPhamMoi("Áo nỉ trùng tên");
    expect(a.slug).toBe("ao-ni-trung-ten");
    expect(b.slug).toBe("ao-ni-trung-ten-2");
  });

  it("hai sản phẩm tạo cùng lúc không lấy trùng mã", async () => {
    const cat = await db.category.findFirstOrThrow({ select: { id: true } });
    const dung = (n: number) =>
      createProduct({
        name: "Song song " + n,
        categoryId: cat.id,
        brandId: null,
        basePrice: 100_000,
        description: "Mô tả đủ dài cho bài kiểm thử này.",
      });

    const ra = await Promise.all([dung(1), dung(2), dung(3)]);
    ra.forEach((p) => rac.products.push(p.id));

    expect(new Set(ra.map((p) => p.code)).size).toBe(3);
    expect(new Set(ra.map((p) => p.slug)).size).toBe(3);
  });
});

describe("biến thể", () => {
  it("biến thể mới luôn có tồn 0 và chưa có dòng sổ kho nào", async () => {
    const p = await sanPhamMoi();
    const v = await addVariant({
      productSlug: p.slug,
      color: "Đen",
      colorHex: "#201e1d",
      size: "L",
      priceDelta: 0,
      lowStockAt: 10,
    });

    const trongDb = await db.variant.findUniqueOrThrow({
      where: { id: v.id },
      select: { stock: true, sku: true, colorHex: true, _count: { select: { movements: true } } },
    });
    expect(trongDb.stock).toBe(0);
    expect(trongDb._count.movements).toBe(0);
    expect(trongDb.sku).toBe(p.code + "-DEN-L");
    expect(trongDb.colorHex).toBe("#201e1d");
  });

  it("mã màu sai định dạng thì dùng màu mặc định chứ không lưu rác", async () => {
    const p = await sanPhamMoi();
    const v = await addVariant({
      productSlug: p.slug,
      color: "Đỏ",
      colorHex: "red",
      size: "M",
      priceDelta: 0,
      lowStockAt: 10,
    });
    const trongDb = await db.variant.findUniqueOrThrow({
      where: { id: v.id },
      select: { colorHex: true },
    });
    expect(trongDb.colorHex).toBe("#cccccc");
  });

  it("trùng màu và size thì chặn", async () => {
    const p = await sanPhamMoi();
    const them = () =>
      addVariant({
        productSlug: p.slug,
        color: "Đen",
        colorHex: "#201e1d",
        size: "L",
        priceDelta: 0,
        lowStockAt: 10,
      });
    await them();
    await expect(them()).rejects.toBeInstanceOf(DuplicateVariantError);
  });

  it("hai màu cùng ba ký tự đầu vẫn ra hai SKU khác nhau", async () => {
    // "Xanh rêu" và "Xanh navy" đều rút về XAN.
    const p = await sanPhamMoi();
    const a = await addVariant({
      productSlug: p.slug, color: "Xanh rêu", colorHex: "#4a5d3a", size: "L",
      priceDelta: 0, lowStockAt: 10,
    });
    const b = await addVariant({
      productSlug: p.slug, color: "Xanh navy", colorHex: "#1f2d4a", size: "L",
      priceDelta: 0, lowStockAt: 10,
    });
    expect(a.sku).not.toBe(b.sku);
    expect(b.sku).toMatch(/-2$/);
  });

  it("xoá được biến thể chưa có lịch sử gì", async () => {
    const p = await sanPhamMoi();
    const v = await addVariant({
      productSlug: p.slug, color: "Be", colorHex: "#d9cfc0", size: "S",
      priceDelta: 0, lowStockAt: 10,
    });

    await deleteVariant(v.id);
    expect(await db.variant.findUnique({ where: { id: v.id } })).toBeNull();
  });

  it("có dòng sổ kho rồi thì không xoá được, kể cả khi tồn đã về 0", async () => {
    const p = await sanPhamMoi();
    const v = await addVariant({
      productSlug: p.slug, color: "Xám", colorHex: "#8a8a8a", size: "M",
      priceDelta: 0, lowStockAt: 10,
    });

    // Nhập 5 rồi trả hết về 0: tồn bằng 0 nhưng lịch sử thì còn.
    await db.$transaction((tx) =>
      moveStock(tx, { variantId: v.id, delta: 5, type: "RECEIPT", actorName: "Kiểm thử" }),
    );
    await db.$transaction((tx) =>
      moveStock(tx, { variantId: v.id, delta: -5, type: "ADJUST", actorName: "Kiểm thử" }),
    );

    await expect(deleteVariant(v.id)).rejects.toBeInstanceOf(VariantInUseError);
    expect(await db.variant.findUnique({ where: { id: v.id } })).not.toBeNull();
  });

  it("còn tồn thì không xoá được", async () => {
    const p = await sanPhamMoi();
    const v = await addVariant({
      productSlug: p.slug, color: "Nâu", colorHex: "#6b4f3a", size: "XL",
      priceDelta: 0, lowStockAt: 10,
    });
    await db.$transaction((tx) =>
      moveStock(tx, { variantId: v.id, delta: 3, type: "RECEIPT", actorName: "Kiểm thử" }),
    );

    await expect(deleteVariant(v.id)).rejects.toThrow(/còn 3 sản phẩm/);
  });
});

describe("danh mục và thương hiệu", () => {
  it("tạo danh mục sinh slug, trùng tên thì chặn", async () => {
    const c = await createCategory("Áo len kiểm thử");
    rac.categories.push(c.id);
    const trongDb = await db.category.findUniqueOrThrow({
      where: { id: c.id },
      select: { slug: true },
    });
    expect(trongDb.slug).toBe("ao-len-kiem-thu");

    await expect(createCategory("áo len KIỂM THỬ")).rejects.toBeInstanceOf(NameTakenError);
  });

  it("đổi tên KHÔNG đổi slug — link công khai cũ phải còn sống", async () => {
    const c = await createCategory("Tên ban đầu kiểm thử");
    rac.categories.push(c.id);

    await renameCategory(c.id, "Tên đã đổi kiểm thử", 5);

    const sau = await db.category.findUniqueOrThrow({
      where: { id: c.id },
      select: { name: true, slug: true, sort: true },
    });
    expect(sau.name).toBe("Tên đã đổi kiểm thử");
    expect(sau.slug).toBe("ten-ban-dau-kiem-thu");
    expect(sau.sort).toBe(5);
  });

  it("còn sản phẩm thì không xoá danh mục", async () => {
    const dangDung = await db.category.findFirstOrThrow({
      where: { products: { some: {} } },
      select: { id: true },
    });
    await expect(deleteCategory(dangDung.id)).rejects.toBeInstanceOf(CategoryInUseError);
  });

  it("danh mục rỗng thì xoá được", async () => {
    const c = await createCategory("Danh mục rỗng kiểm thử");
    await deleteCategory(c.id);
    expect(await db.category.findUnique({ where: { id: c.id } })).toBeNull();
  });

  it("thương hiệu: trùng tên chặn, còn sản phẩm thì không xoá", async () => {
    const b = await createBrand("Nhãn kiểm thử");
    rac.brands.push(b.id);
    await expect(createBrand("Nhãn kiểm thử")).rejects.toBeInstanceOf(NameTakenError);

    const dangDung = await db.brand.findFirstOrThrow({
      where: { products: { some: {} } },
      select: { id: true },
    });
    await expect(deleteBrand(dangDung.id)).rejects.toBeInstanceOf(CategoryInUseError);

    await deleteBrand(b.id);
    expect(await db.brand.findUnique({ where: { id: b.id } })).toBeNull();
    rac.brands.length = 0;
  });
});
