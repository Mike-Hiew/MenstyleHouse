import { afterEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { mergeGuestCart } from "../src/server/cart";
import { changePassword, updateProfile, WrongPasswordError, EmailTakenError, PhoneTakenError } from "../src/server/accounts";
import { createReview, NotBoughtError, AlreadyReviewedError } from "../src/server/reviews";
import { toggleWishlist, listWishlist, isWished } from "../src/server/wishlist";
import { saveAddress, listAddresses, setDefaultAddress, deleteAddress } from "../src/server/addresses";
import { moveStock } from "../src/lib/inventory";

/**
 * Những thứ bổ sung ở M6.13, sau lượt đóng vai người dùng thật.
 *
 * Bài nặng nhất là **gộp giỏ**: lỗi cũ làm mọi khách đăng nhập mất sạch giỏ,
 * mà hàng vẫn nằm trong DB nên không có gì đỏ để ai kịp nhận ra.
 */

const rac = { users: [] as string[], carts: [] as string[], products: [] as string[], orders: [] as string[] };

afterEach(async () => {
  await db.orderItem.deleteMany({ where: { orderId: { in: rac.orders } } });
  await db.order.deleteMany({ where: { id: { in: rac.orders } } });
  await db.cart.deleteMany({ where: { id: { in: rac.carts } } });
  const bt = await db.variant.findMany({ where: { productId: { in: rac.products } }, select: { id: true } });
  await db.inventoryMovement.deleteMany({ where: { variantId: { in: bt.map((v) => v.id) } } });
  await db.cartItem.deleteMany({ where: { variantId: { in: bt.map((v) => v.id) } } });
  await db.variant.deleteMany({ where: { productId: { in: rac.products } } });
  await db.review.deleteMany({ where: { productId: { in: rac.products } } });
  await db.product.deleteMany({ where: { id: { in: rac.products } } });
  await db.user.deleteMany({ where: { id: { in: rac.users } } });
  for (const k of Object.values(rac)) k.length = 0;
});

let dem = 0;

async function nguoiDung(mk = "matkhaucu") {
  dem += 1;
  const u = await db.user.create({
    data: {
      name: "Khách kiểm thử " + dem,
      phone: "0921" + String(100000 + dem).slice(-6),
      email: `tk${dem}.${Date.now()}@vidu.vn`,
      passwordHash: await bcrypt.hash(mk, 10),
    },
  });
  rac.users.push(u.id);
  return u;
}

async function sanPham() {
  dem += 1;
  const cat = await db.category.findFirstOrThrow({ select: { id: true } });
  const p = await db.product.create({
    data: {
      name: "Áo kiểm thử tài khoản " + dem,
      slug: `ao-kt-tk-${dem}-${Date.now()}`,
      code: `TK${Date.now()}${dem}`.slice(-8),
      description: "Sản phẩm dựng để kiểm thử.",
      categoryId: cat.id,
      basePrice: 250_000,
      status: "ACTIVE",
      variants: { create: { sku: `TK-${Date.now()}-${dem}`, color: "Đen", colorHex: "#000000", size: "L" } },
    },
    include: { variants: true },
  });
  rac.products.push(p.id);

  /*
   * Cấp tồn qua `moveStock`, **không** ghi thẳng `stock`. Đó là điểm vào duy
   * nhất và luôn sinh một dòng sổ; ghi thẳng là phá bất biến
   * `stock === Σ(movements.delta)` mà `tests/inventory.test.ts` canh.
   */
  await moveStock(db, {
    variantId: p.variants[0].id,
    delta: 20,
    type: "RECEIPT",
    note: "Nhập cho kiểm thử tài khoản",
    actorName: "kiểm thử",
  });

  return { product: p, variant: p.variants[0] };
}

describe("gộp giỏ khi đăng nhập", () => {
  it("chưa có giỏ member thì nhận luôn giỏ khách, GIỮ NGUYÊN token", async () => {
    /*
     * Đây chính là lỗi cũ. Bản trước tạo giỏ mới với token ngẫu nhiên rồi xoá
     * giỏ khách, nên cookie trên trình duyệt trỏ vào một dòng không còn tồn tại
     * và khách mất sạch giỏ ngay lúc đăng nhập.
     */
    const u = await nguoiDung();
    const { variant } = await sanPham();
    const gio = await db.cart.create({
      data: { token: "kt-" + Date.now(), items: { create: { variantId: variant.id, qty: 2 } } },
    });
    rac.carts.push(gio.id);

    await mergeGuestCart(gio.token, u.id);

    const sau = await db.cart.findUnique({ where: { token: gio.token }, include: { items: true } });
    expect(sau, "giỏ phải còn tra được bằng đúng token cũ").not.toBeNull();
    expect(sau!.userId).toBe(u.id);
    expect(sau!.items[0].qty).toBe(2);
  });

  it("đã có giỏ member thì CỘNG dồn, không ghi đè", async () => {
    const u = await nguoiDung();
    const { variant } = await sanPham();

    const cua = await db.cart.create({
      data: { token: "kt-cua-" + Date.now(), userId: u.id, items: { create: { variantId: variant.id, qty: 1 } } },
    });
    const khach = await db.cart.create({
      data: { token: "kt-khach-" + Date.now(), items: { create: { variantId: variant.id, qty: 3 } } },
    });
    rac.carts.push(cua.id, khach.id);

    await mergeGuestCart(khach.token, u.id);

    const sau = await db.cart.findUniqueOrThrow({ where: { id: cua.id }, include: { items: true } });
    expect(sau.items[0].qty).toBe(4);
    expect(await db.cart.findUnique({ where: { id: khach.id } })).toBeNull();
  });

  it("gọi lại lần hai không nhân đôi số lượng", async () => {
    const u = await nguoiDung();
    const { variant } = await sanPham();
    const gio = await db.cart.create({
      data: { token: "kt2-" + Date.now(), items: { create: { variantId: variant.id, qty: 2 } } },
    });
    rac.carts.push(gio.id);

    await mergeGuestCart(gio.token, u.id);
    await mergeGuestCart(gio.token, u.id);

    const sau = await db.cart.findUniqueOrThrow({ where: { token: gio.token }, include: { items: true } });
    expect(sau.items[0].qty).toBe(2);
  });
});

describe("hồ sơ và mật khẩu", () => {
  it("sửa được họ tên, số điện thoại, email", async () => {
    const u = await nguoiDung();
    await updateProfile(u.id, { name: "Tên Mới", phone: "0938111222", email: "moi@vidu.vn" });
    const sau = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect([sau.name, sau.phone, sau.email]).toEqual(["Tên Mới", "0938111222", "moi@vidu.vn"]);
  });

  it("không đổi sang số điện thoại của người khác", async () => {
    // Số điện thoại là tên đăng nhập; cho trùng là cướp đường vào của họ.
    const a = await nguoiDung();
    const b = await nguoiDung();
    await expect(
      updateProfile(a.id, { name: a.name, phone: b.phone!, email: "" }),
    ).rejects.toThrow(PhoneTakenError);
  });

  it("không đổi sang email của người khác", async () => {
    const a = await nguoiDung();
    const b = await nguoiDung();
    await expect(
      updateProfile(a.id, { name: a.name, phone: a.phone!, email: b.email! }),
    ).rejects.toThrow(EmailTakenError);
  });

  it("đổi mật khẩu phải nhập đúng mật khẩu hiện tại", async () => {
    const u = await nguoiDung("matkhaucu");
    await expect(
      changePassword(u.id, { current: "sai-bet", password: "matkhaumoi1" }),
    ).rejects.toThrow(WrongPasswordError);
  });

  it("đổi mật khẩu xong thì phiên cũ chết", async () => {
    const u = await nguoiDung("matkhaucu");
    await changePassword(u.id, { current: "matkhaucu", password: "matkhaumoi1" });

    const sau = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await bcrypt.compare("matkhaumoi1", sau.passwordHash!)).toBe(true);
    expect(sau.sessionsValidFrom.getTime()).toBeGreaterThan(u.sessionsValidFrom.getTime());
  });
});

describe("đánh giá sản phẩm", () => {
  const LOI = "Vải dày dặn, form chuẩn, mặc cả ngày không nhăn.";

  async function donDaGiao(variantId: string, sku: string, phone: string, status: "DELIVERED" | "PENDING" = "DELIVERED") {
    dem += 1;
    const d = await db.order.create({
      data: {
        code: `KT-${Date.now()}-${dem}`,
        isGuest: true,
        receiver: "Khách",
        phone,
        province: "TP.HCM",
        district: "Quận 1",
        ward: "Bến Nghé",
        street: "1 Đường số 1",
        status,
        paymentMethod: "COD",
        subtotal: 250_000,
        shippingFee: 0,
        discount: 0,
        total: 250_000,
        items: {
          create: {
            variantId,
            sku,
            productName: "Áo kiểm thử",
            color: "Đen",
            size: "L",
            unitPrice: 250_000,
            qty: 1,
            lineTotal: 250_000,
          },
        },
      },
    });
    rac.orders.push(d.id);
    return d;
  }

  it("người chưa mua thì không đánh giá được", async () => {
    // Không chặn thì trang sản phẩm thành bảng tin ai viết gì cũng được, và
    // con số 4.8/5 ngoài trang chủ mất sạch ý nghĩa.
    const { product } = await sanPham();
    await expect(
      createReview({ productId: product.id, phone: "0900000123", authorName: "Người Lạ", rating: 5, body: LOI }),
    ).rejects.toThrow(NotBoughtError);
  });

  it("đơn chưa giao xong cũng chưa đánh giá được", async () => {
    const { product, variant } = await sanPham();
    const sdt = "0938" + String(Date.now()).slice(-6);
    await donDaGiao(variant.id, variant.sku, sdt, "PENDING");
    await expect(
      createReview({ productId: product.id, phone: sdt, authorName: "Khách", rating: 5, body: LOI }),
    ).rejects.toThrow(NotBoughtError);
  });

  it("người đã mua thì gửi được, và đánh giá vào hàng CHỜ DUYỆT", async () => {
    const { product, variant } = await sanPham();
    const sdt = "0939" + String(Date.now()).slice(-6);
    await donDaGiao(variant.id, variant.sku, sdt);

    const { id } = await createReview({
      productId: product.id,
      phone: sdt,
      authorName: "Khách Đã Mua",
      rating: 5,
      body: LOI,
    });

    const r = await db.review.findUniqueOrThrow({ where: { id } });
    expect(r.approved, "lọt thẳng lên trang là vô hiệu hoá cả khâu duyệt").toBe(false);
  });

  it("một đơn chỉ đánh giá một lần", async () => {
    const { product, variant } = await sanPham();
    const sdt = "0940" + String(Date.now()).slice(-6);
    await donDaGiao(variant.id, variant.sku, sdt);

    await createReview({ productId: product.id, phone: sdt, authorName: "Khách", rating: 5, body: LOI });
    await expect(
      createReview({ productId: product.id, phone: sdt, authorName: "Khách", rating: 1, body: LOI }),
    ).rejects.toThrow(AlreadyReviewedError);
  });
});

describe("sản phẩm yêu thích", () => {
  it("bấm là thích, bấm lại là bỏ thích", async () => {
    const u = await nguoiDung();
    const { product } = await sanPham();

    expect(await toggleWishlist(u.id, product.id)).toBe(true);
    expect(await isWished(u.id, product.id)).toBe(true);
    expect(await toggleWishlist(u.id, product.id)).toBe(false);
    expect(await isWished(u.id, product.id)).toBe(false);
  });

  it("danh sách bỏ qua sản phẩm đã ngừng bán", async () => {
    // Bán chạy hay không kệ, đã ẩn thì bấm vào là ngõ cụt.
    const u = await nguoiDung();
    const { product } = await sanPham();
    await toggleWishlist(u.id, product.id);
    await db.product.update({ where: { id: product.id }, data: { status: "ARCHIVED" } });

    expect((await listWishlist(u.id)).some((p) => p.id === product.id)).toBe(false);
  });
});

describe("sổ địa chỉ", () => {
  const MAU = {
    label: "Nhà",
    receiver: "Nguyễn Văn A",
    phone: "0903128447",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Bến Nghé",
    street: "12 Nguyễn Huệ",
  };

  it("lưu được và đọc lại được", async () => {
    const u = await nguoiDung();
    await saveAddress(u.id, MAU);
    const ds = await listAddresses(u.id);
    expect(ds).toHaveLength(1);
    expect(ds[0].street).toBe("12 Nguyễn Huệ");
  });

  it("địa chỉ đầu tiên tự thành mặc định", async () => {
    const u = await nguoiDung();
    await saveAddress(u.id, MAU);
    expect((await listAddresses(u.id))[0].isDefault).toBe(true);
  });

  it("đặt mặc định cái khác thì cái cũ thôi mặc định", async () => {
    const u = await nguoiDung();
    await saveAddress(u.id, MAU);
    await saveAddress(u.id, { ...MAU, label: "Công ty", street: "25 Lê Lợi" });
    const ds = await listAddresses(u.id);
    const congTy = ds.find((d) => d.label === "Công ty")!;

    await setDefaultAddress(u.id, congTy.id);
    const sau = await listAddresses(u.id);
    expect(sau.filter((d) => d.isDefault)).toHaveLength(1);
    expect(sau.find((d) => d.isDefault)!.label).toBe("Công ty");
  });

  it("không xoá được địa chỉ của người khác", async () => {
    const a = await nguoiDung();
    const b = await nguoiDung();
    await saveAddress(a.id, MAU);
    const cua = (await listAddresses(a.id))[0];

    await deleteAddress(b.id, cua.id);
    expect(await listAddresses(a.id)).toHaveLength(1);
  });
});
