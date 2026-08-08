import { afterEach, describe, expect, it } from "vitest";
import { getBestsellers, getFlashSale, getHomeReviews } from "../src/server/home";
import { dangKyNhanTin, huyNhanTin } from "../src/server/newsletter";
import { db } from "../src/lib/db";

/**
 * Bốn khối trang chủ dựng ở M6.11.
 *
 * Trang chủ là chỗ khách tin nhất, nên hai luật đáng canh nhất ở đây đều là
 * luật **không được nói dối**:
 *
 *   - số "đã bán" phải đếm cùng danh sách trạng thái với báo cáo doanh thu, để
 *     chủ cửa hàng không phải hỏi vì sao hai chỗ ra hai con số;
 *   - băng-rôn sale chỉ hiện mã **gõ vào là ăn**; mã hết lượt, hết hạn hay chỉ
 *     dành cho thành viên thì không được đem ra mời khách vãng lai.
 */

/** Mã giảm giá bị tắt tạm trong lúc kiểm băng-rôn sale, để khôi phục sau. */
let tatTam: string[] = [];

const rac = {
  orders: [] as string[],
  products: [] as string[],
  reviews: [] as string[],
  coupons: [] as string[],
  mails: [] as string[],
};

afterEach(async () => {
  await db.orderItem.deleteMany({ where: { orderId: { in: rac.orders } } });
  await db.order.deleteMany({ where: { id: { in: rac.orders } } });
  await db.review.deleteMany({ where: { id: { in: rac.reviews } } });
  const bt = await db.variant.findMany({
    where: { productId: { in: rac.products } },
    select: { id: true },
  });
  await db.inventoryMovement.deleteMany({ where: { variantId: { in: bt.map((v) => v.id) } } });
  await db.variant.deleteMany({ where: { productId: { in: rac.products } } });
  await db.product.deleteMany({ where: { id: { in: rac.products } } });
  await db.coupon.deleteMany({ where: { id: { in: rac.coupons } } });
  await db.newsletterSubscriber.deleteMany({ where: { email: { in: rac.mails } } });
  // Bật lại đúng những mã mình đã tắt, không bật bừa mọi mã trong DB.
  if (tatTam.length) {
    await db.coupon.updateMany({ where: { id: { in: tatTam } }, data: { active: true } });
    tatTam = [];
  }
  for (const k of Object.values(rac)) k.length = 0;
});

let dem = 0;

/** Một sản phẩm còn bán, kèm đúng một biến thể để gắn dòng đơn vào. */
async function sanPhamCoBien(opts: { active?: boolean } = {}) {
  dem += 1;
  const cat = await db.category.findFirstOrThrow({ select: { id: true } });
  const p = await db.product.create({
    data: {
      name: `Áo kiểm thử trang chủ ${dem}`,
      slug: `ao-kiem-thu-trang-chu-${dem}-${Date.now()}`,
      code: `TC${Date.now()}${dem}`.slice(-8),
      description: "Sản phẩm dựng cho kiểm thử trang chủ.",
      categoryId: cat.id,
      basePrice: 300_000,
      status: opts.active === false ? "DRAFT" : "ACTIVE",
      variants: {
        create: {
          sku: `TC-${Date.now()}-${dem}`,
          color: "Đen",
          colorHex: "#000000",
          size: "L",
        },
      },
    },
    include: { variants: true },
  });
  rac.products.push(p.id);
  return { product: p, variant: p.variants[0] };
}

/** Một đơn chứa `qty` món của một biến thể, đặt cách đây `cachDay` ngày. */
async function donCo(input: {
  variantId: string;
  sku: string;
  qty: number;
  status: "DELIVERED" | "CANCELLED" | "RETURNED" | "PENDING";
  cachDay?: number;
}) {
  dem += 1;
  const luc = new Date(Date.now() - (input.cachDay ?? 1) * 86_400_000);
  const don = await db.order.create({
    data: {
      code: `TC-${Date.now()}-${dem}`,
      isGuest: true,
      receiver: "Khách kiểm thử",
      phone: "0900000000",
      province: "TP.HCM",
      district: "Quận 1",
      ward: "Bến Nghé",
      street: "1 Đường số 1",
      status: input.status,
      paymentMethod: "COD",
      subtotal: 300_000 * input.qty,
      shippingFee: 0,
      discount: 0,
      total: 300_000 * input.qty,
      createdAt: luc,
      items: {
        create: {
          variantId: input.variantId,
          sku: input.sku,
          productName: "Áo kiểm thử trang chủ",
          color: "Đen",
          size: "L",
          unitPrice: 300_000,
          qty: input.qty,
          lineTotal: 300_000 * input.qty,
        },
      },
    },
  });
  rac.orders.push(don.id);
  return don;
}

describe("bán chạy nhất", () => {
  it("đếm số đã bán trong 30 ngày", async () => {
    const { product, variant } = await sanPhamCoBien();
    await donCo({ variantId: variant.id, sku: variant.sku, qty: 7, status: "DELIVERED" });

    const ra = await getBestsellers(50);
    expect(ra.find((b) => b.san_pham.id === product.id)?.daBan).toBe(7);
  });

  it("KHÔNG đếm đơn huỷ và đơn trả hàng", async () => {
    /*
     * Đây là bài quan trọng nhất của cả file. Đếm cả đơn huỷ thì số ngoài trang
     * chủ to hơn số trong báo cáo doanh thu, và không ai giải thích được vì sao
     * trang chủ ghi bán 12 mà báo cáo ghi 5.
     */
    const { product, variant } = await sanPhamCoBien();
    await donCo({ variantId: variant.id, sku: variant.sku, qty: 5, status: "DELIVERED" });
    await donCo({ variantId: variant.id, sku: variant.sku, qty: 4, status: "CANCELLED" });
    await donCo({ variantId: variant.id, sku: variant.sku, qty: 3, status: "RETURNED" });

    const ra = await getBestsellers(50);
    expect(ra.find((b) => b.san_pham.id === product.id)?.daBan).toBe(5);
  });

  it("bỏ đơn cũ hơn cửa sổ 30 ngày", async () => {
    // Nhãn ghi "30 NGÀY QUA" nên con số phải đúng là 30 ngày qua.
    const { product, variant } = await sanPhamCoBien();
    await donCo({ variantId: variant.id, sku: variant.sku, qty: 9, status: "DELIVERED", cachDay: 45 });
    await donCo({ variantId: variant.id, sku: variant.sku, qty: 2, status: "DELIVERED", cachDay: 3 });

    const ra = await getBestsellers(50);
    expect(ra.find((b) => b.san_pham.id === product.id)?.daBan).toBe(2);
  });

  it("không đem sản phẩm đã ẩn lên trang chủ", async () => {
    // Bán chạy nhưng đã ngừng bán thì đưa lên là mời khách bấm vào ngõ cụt.
    const { product, variant } = await sanPhamCoBien({ active: false });
    await donCo({ variantId: variant.id, sku: variant.sku, qty: 99, status: "DELIVERED" });

    const ra = await getBestsellers(50);
    expect(ra.some((b) => b.san_pham.id === product.id)).toBe(false);
  });

  it("xếp giảm dần và cắt đúng số lượng xin", async () => {
    const a = await sanPhamCoBien();
    const b = await sanPhamCoBien();
    await donCo({ variantId: a.variant.id, sku: a.variant.sku, qty: 3, status: "DELIVERED" });
    await donCo({ variantId: b.variant.id, sku: b.variant.sku, qty: 8, status: "DELIVERED" });

    const ra = await getBestsellers(50);
    const iA = ra.findIndex((x) => x.san_pham.id === a.product.id);
    const iB = ra.findIndex((x) => x.san_pham.id === b.product.id);
    expect(iB).toBeLessThan(iA);
    expect((await getBestsellers(2)).length).toBeLessThanOrEqual(2);
  });
});

describe("lời khách trên trang chủ", () => {
  async function danhGia(input: { rating: number; body: string; approved: boolean }) {
    const { product } = await sanPhamCoBien();
    const r = await db.review.create({
      data: {
        productId: product.id,
        authorName: "Người kiểm thử",
        rating: input.rating,
        body: input.body,
        imageUrls: [],
        approved: input.approved,
      },
    });
    rac.reviews.push(r.id);
    return r;
  }

  const DAI = "Vải dày dặn, mặc mát cả ngày, đường may chắc chắn không xù.";

  it("chỉ lấy đánh giá đã duyệt", async () => {
    // Có màn duyệt riêng ở admin; lọt lên trang chủ trước khi duyệt là vô hiệu
    // hoá cả khâu duyệt.
    const r = await danhGia({ rating: 5, body: DAI, approved: false });
    const ra = await getHomeReviews(50);
    expect(ra.some((x) => x.id === r.id)).toBe(false);
  });

  it("bỏ đánh giá dưới 4 sao", async () => {
    const r = await danhGia({ rating: 3, body: DAI, approved: true });
    expect((await getHomeReviews(50)).some((x) => x.id === r.id)).toBe(false);
  });

  it("bỏ lời quá ngắn — chiếm chỗ mà không nói được gì", async () => {
    const r = await danhGia({ rating: 5, body: "Ok đẹp", approved: true });
    expect((await getHomeReviews(50)).some((x) => x.id === r.id)).toBe(false);
  });

  it("lời đủ dài và đã duyệt thì lên, kèm tên sản phẩm đã mua", async () => {
    const r = await danhGia({ rating: 5, body: DAI, approved: true });
    const thay = (await getHomeReviews(50)).find((x) => x.id === r.id);
    expect(thay?.noiDung).toBe(DAI);
    expect(thay?.moTa).toMatch(/^Đã mua /);
  });
});

describe("băng-rôn sale", () => {
  const NGAY = 86_400_000;

  async function ma(input: {
    code: string;
    memberOnly?: boolean;
    usageLimit?: number | null;
    usedCount?: number;
    tu?: number;
    den?: number;
    active?: boolean;
  }) {
    const c = await db.coupon.create({
      data: {
        code: input.code,
        type: "PERCENT",
        value: 15,
        usageLimit: input.usageLimit ?? null,
        usedCount: input.usedCount ?? 0,
        memberOnly: input.memberOnly ?? false,
        active: input.active ?? true,
        startsAt: new Date(Date.now() + (input.tu ?? -NGAY)),
        endsAt: new Date(Date.now() + (input.den ?? 30 * NGAY)),
      },
    });
    rac.coupons.push(c.id);
    return c;
  }

  /**
   * Tắt tạm mã của seed để bài kiểm chỉ nhìn thấy mã mình vừa tạo.
   *
   * Ghi lại **đúng những mã đang bật** rồi khôi phục đúng chừng ấy ở `afterEach`.
   * Cách viết dễ hơn — tắt hết rồi bật lại tất — sẽ bật cả những mã file kiểm
   * thử khác cố ý để tắt, và làm bài của họ đỏ vì lý do chẳng liên quan gì.
   */
  async function chiCon(codes: string[]) {
    const khac = await db.coupon.findMany({
      where: { active: true, code: { notIn: codes } },
      select: { id: true },
    });
    tatTam = khac.map((c) => c.id);
    await db.coupon.updateMany({ where: { id: { in: tatTam } }, data: { active: false } });
  }

  it("không quảng cáo mã đã hết lượt", async () => {
    // Mã hết lượt vẫn còn `active` trong DB; gõ vào là bị từ chối ở bước cuối.
    await ma({ code: "TC-HET", usageLimit: 100, usedCount: 100 });
    await chiCon(["TC-HET"]);
    expect(await getFlashSale()).toBeNull();
  });

  it("không quảng cáo mã chỉ dành cho thành viên", async () => {
    // Băng-rôn này khách vãng lai cũng thấy.
    await ma({ code: "TC-VIP", memberOnly: true });
    await chiCon(["TC-VIP"]);
    expect(await getFlashSale()).toBeNull();
  });

  it("không quảng cáo mã chưa tới ngày hoặc đã hết hạn", async () => {
    await ma({ code: "TC-SOM", tu: 5 * NGAY, den: 10 * NGAY });
    await ma({ code: "TC-HHAN", tu: -10 * NGAY, den: -NGAY });
    await chiCon(["TC-SOM", "TC-HHAN"]);
    expect(await getFlashSale()).toBeNull();
  });

  it("lấy mã sắp hết hạn nhất trong số đang chạy", async () => {
    await ma({ code: "TC-XA", den: 20 * NGAY });
    await ma({ code: "TC-GAN", den: 2 * NGAY });
    await chiCon(["TC-XA", "TC-GAN"]);
    const sale = await getFlashSale();
    expect(sale?.code).toBe("TC-GAN");
    expect(sale?.conLai).toBeNull();
  });

  it("còn giới hạn lượt thì nói rõ còn bao nhiêu", async () => {
    await ma({ code: "TC-CON", usageLimit: 300, usedCount: 288, den: NGAY });
    await chiCon(["TC-CON"]);
    expect((await getFlashSale())?.conLai).toBe(12);
  });
});

describe("nhận tin sale", () => {
  it("đăng ký hai lần không phải là lỗi, và chỉ có một dòng", async () => {
    // Người ta gõ email, bấm, thấy im ru thì bấm lại. Mắng họ vì việc đó là sai.
    const email = `tin${Date.now()}@vidu.vn`;
    rac.mails.push(email);

    await dangKyNhanTin(email);
    await dangKyNhanTin(email);

    expect(await db.newsletterSubscriber.count({ where: { email } })).toBe(1);
  });

  it("chuẩn hoá email — hoa/thường và khoảng trắng không tạo ra hai dòng", async () => {
    const email = `tin2.${Date.now()}@vidu.vn`;
    rac.mails.push(email);

    await dangKyNhanTin(`  ${email.toUpperCase()} `);
    await dangKyNhanTin(email);

    expect(await db.newsletterSubscriber.count({ where: { email } })).toBe(1);
  });

  it("huỷ nhận tin là đánh dấu, không xoá dòng", async () => {
    // Xoá dòng thì người ta đăng ký lại rồi lại nhận thư, mà không còn dấu vết
    // là họ từng bảo đừng gửi nữa.
    const email = `tin3.${Date.now()}@vidu.vn`;
    rac.mails.push(email);

    await dangKyNhanTin(email);
    await huyNhanTin(email);

    const d = await db.newsletterSubscriber.findUniqueOrThrow({ where: { email } });
    expect(d.unsubscribedAt).not.toBeNull();
  });

  it("đăng ký lại sau khi huỷ thì bật lại", async () => {
    const email = `tin4.${Date.now()}@vidu.vn`;
    rac.mails.push(email);

    await dangKyNhanTin(email);
    await huyNhanTin(email);
    await dangKyNhanTin(email);

    const d = await db.newsletterSubscriber.findUniqueOrThrow({ where: { email } });
    expect(d.unsubscribedAt).toBeNull();
  });

  it("email sai định dạng thì ném lỗi, không lưu", async () => {
    await expect(dangKyNhanTin("khong-phai-email")).rejects.toThrow();
  });
});
