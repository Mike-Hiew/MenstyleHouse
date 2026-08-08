import { afterEach, describe, expect, it } from "vitest";
import {
  CouponCodeTakenError,
  CouponInUseError,
  InvalidCouponError,
  createCoupon,
  dangChay,
  deleteCoupon,
  toggleCoupon,
  updateCoupon,
} from "../src/server/admin/coupons";
import { doanhThuTheoThang, tongQuanBaoCao, topSanPham } from "../src/server/admin/reports";
import { applyCoupon } from "../src/server/coupons";
import { db } from "../src/lib/db";

/**
 * Nghiệm thu M6 phần mã giảm giá và báo cáo.
 *
 * Hai chỗ hỏng thì hỏng lặng lẽ:
 *   1. `usedCount` bị sửa tay → mã giới hạn 100 lượt bị dùng quá mà sổ vẫn đúng.
 *   2. Đơn đã huỷ lọt vào doanh thu → báo cáo đếm tiền chưa bao giờ về.
 */

const rac: string[] = [];
const donRac: string[] = [];

afterEach(async () => {
  await db.coupon.deleteMany({ where: { id: { in: rac } } });
  await db.order.deleteMany({ where: { id: { in: donRac } } });
  rac.length = 0;
  donRac.length = 0;
});

const ngay = (lech: number) => {
  const d = new Date();
  d.setDate(d.getDate() + lech);
  return d;
};

const mau = (over: Partial<Parameters<typeof createCoupon>[0]> = {}) => ({
  code: "TEST" + Math.abs(Number(process.hrtime.bigint() % 100000n)),
  type: "PERCENT" as const,
  value: 10,
  minSubtotal: 0,
  maxDiscount: null,
  usageLimit: null,
  perUserLimit: null,
  memberOnly: false,
  startsAt: ngay(-1),
  endsAt: ngay(30),
  active: true,
  ...over,
});

async function tao(over: Parameters<typeof mau>[0] = {}) {
  const c = await createCoupon(mau(over));
  rac.push(c.id);
  return c;
}

describe("kiểm điều kiện mã", () => {
  it("chặn mã sai định dạng", async () => {
    await expect(createCoupon(mau({ code: "ab" }))).rejects.toBeInstanceOf(InvalidCouponError);
    await expect(createCoupon(mau({ code: "có dấu" }))).rejects.toBeInstanceOf(InvalidCouponError);
  });

  it("chặn phần trăm ngoài 1–100", async () => {
    await expect(createCoupon(mau({ value: 0 }))).rejects.toThrow(/1–100/);
    await expect(createCoupon(mau({ value: 150 }))).rejects.toThrow(/1–100/);
  });

  it("chặn ngày kết thúc trước ngày bắt đầu", async () => {
    await expect(
      createCoupon(mau({ startsAt: ngay(10), endsAt: ngay(1) })),
    ).rejects.toThrow(/sau ngày bắt đầu/);
  });

  it("chặn giảm tiền cố định quá nhỏ, và trần thấp hơn chính nó", async () => {
    await expect(createCoupon(mau({ type: "FIXED", value: 500 }))).rejects.toThrow(/1.000/);
    await expect(
      createCoupon(mau({ type: "FIXED", value: 50_000, maxDiscount: 20_000 })),
    ).rejects.toThrow(/không được nhỏ hơn/);
  });

  it("trùng mã thì báo đúng lỗi", async () => {
    const c = await tao();
    const trung = await db.coupon.findUniqueOrThrow({ where: { id: c.id }, select: { code: true } });
    await expect(createCoupon(mau({ code: trung.code }))).rejects.toBeInstanceOf(
      CouponCodeTakenError,
    );
  });
});

describe("usedCount không phải ô nhập", () => {
  it("sửa mã không đụng tới lượt đã dùng", async () => {
    const c = await tao({ usageLimit: 100 });
    await db.coupon.update({ where: { id: c.id }, data: { usedCount: 37 } });

    await updateCoupon(c.id, {
      type: "PERCENT",
      value: 25,
      minSubtotal: 200_000,
      maxDiscount: null,
      usageLimit: 100,
      perUserLimit: null,
      memberOnly: true,
      startsAt: ngay(-1),
      endsAt: ngay(60),
      active: true,
    });

    const sau = await db.coupon.findUniqueOrThrow({ where: { id: c.id } });
    expect(sau.usedCount).toBe(37);
    expect(sau.value).toBe(25);
    expect(sau.memberOnly).toBe(true);
  });

  it("sửa mã không đổi được chính ký tự mã — mã đã phát ra ngoài", async () => {
    const c = await tao();
    const truoc = await db.coupon.findUniqueOrThrow({ where: { id: c.id } });

    await updateCoupon(c.id, {
      type: truoc.type,
      value: truoc.value,
      minSubtotal: truoc.minSubtotal,
      maxDiscount: truoc.maxDiscount,
      usageLimit: truoc.usageLimit,
      perUserLimit: truoc.perUserLimit,
      memberOnly: truoc.memberOnly,
      startsAt: truoc.startsAt,
      endsAt: truoc.endsAt,
      active: truoc.active,
    });

    const sau = await db.coupon.findUniqueOrThrow({ where: { id: c.id } });
    expect(sau.code).toBe(truoc.code);
  });
});

describe("đang chạy hay hết hạn", () => {
  it("phải đủ cả bốn điều kiện", () => {
    const goc = { active: true, startsAt: ngay(-1), endsAt: ngay(1), usageLimit: null, usedCount: 0 };
    expect(dangChay(goc)).toBe(true);
    expect(dangChay({ ...goc, active: false })).toBe(false);
    expect(dangChay({ ...goc, startsAt: ngay(2) })).toBe(false);
    expect(dangChay({ ...goc, endsAt: ngay(-1) })).toBe(false);
    expect(dangChay({ ...goc, usageLimit: 5, usedCount: 5 })).toBe(false);
  });

  it("tắt mã thì khách không dùng được nữa", async () => {
    const c = await tao();
    const code = (await db.coupon.findUniqueOrThrow({ where: { id: c.id } })).code;

    expect((await applyCoupon(code, 500_000)).ok).toBe(true);
    await toggleCoupon(c.id, false);
    expect((await applyCoupon(code, 500_000)).ok).toBe(false);
  });
});

describe("xoá mã", () => {
  it("chưa ai dùng thì xoá được", async () => {
    const c = await tao();
    await deleteCoupon(c.id);
    expect(await db.coupon.findUnique({ where: { id: c.id } })).toBeNull();
    rac.length = 0;
  });

  it("đã có người dùng thì chặn, bảo đi tắt", async () => {
    const c = await tao();
    await db.coupon.update({ where: { id: c.id }, data: { usedCount: 3 } });
    await expect(deleteCoupon(c.id)).rejects.toBeInstanceOf(CouponInUseError);
    await expect(deleteCoupon(c.id)).rejects.toThrow(/Tắt nó đi/);
  });
});

/** Đơn tối giản để kiểm báo cáo, không đụng tồn kho. */
async function donMau(total: number, status: "DELIVERED" | "CANCELLED", lechThang = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - lechThang);
  const o = await db.order.create({
    data: {
      code: "TEST-BC-" + Math.abs(Number(process.hrtime.bigint() % 100000000n)),
      status,
      paymentMethod: "COD",
      createdAt: d,
      receiver: "Kiểm thử báo cáo",
      phone: "0900123456",
      province: "TP.HCM",
      district: "Phú Nhuận",
      ward: "Phường 8",
      street: "142 Nguyễn Văn Trỗi",
      subtotal: total,
      total,
    },
    select: { id: true },
  });
  donRac.push(o.id);
  return o;
}

describe("báo cáo doanh thu", () => {
  it("đơn đã huỷ KHÔNG tính vào doanh thu", async () => {
    const truoc = await tongQuanBaoCao();
    await donMau(1_000_000, "DELIVERED");
    await donMau(9_000_000, "CANCELLED");

    const sau = await tongQuanBaoCao();
    expect(sau.doanhThu - truoc.doanhThu).toBe(1_000_000);
    expect(sau.soDon - truoc.soDon).toBe(1);
    expect(sau.soDonHuy - truoc.soDonHuy).toBe(1);
  });

  it("giá trị đơn trung bình là số nguyên đồng", async () => {
    const truoc = await tongQuanBaoCao();
    await donMau(1_000_000, "DELIVERED");
    await donMau(1_000_001, "DELIVERED");

    const sau = await tongQuanBaoCao();
    expect(Number.isInteger(sau.gtdh)).toBe(true);
    expect(sau.gtdh).toBe(Math.round(sau.doanhThu / sau.soDon));
    expect(truoc.gtdh).toBeGreaterThanOrEqual(0);
  });

  it("xếp đơn vào đúng tháng đặt, và trả đủ số kỳ đã hỏi", async () => {
    await donMau(500_000, "DELIVERED", 2);

    const ky = await doanhThuTheoThang(6);
    expect(ky).toHaveLength(6);
    // Mới nhất đứng đầu.
    expect(ky[0].nam * 12 + ky[0].thang).toBeGreaterThan(ky[5].nam * 12 + ky[5].thang);

    const bay = new Date();
    bay.setMonth(bay.getMonth() - 2);
    const dung = ky.find((k) => k.thang === bay.getMonth() + 1 && k.nam === bay.getFullYear());
    expect(dung?.doanhThu).toBeGreaterThanOrEqual(500_000);
  });

  it("tháng không có đơn thì ra 0 chứ không biến mất khỏi bảng", async () => {
    const ky = await doanhThuTheoThang(12);
    expect(ky).toHaveLength(12);
    expect(ky.every((k) => Number.isInteger(k.doanhThu) && k.doanhThu >= 0)).toBe(true);
    expect(ky.every((k) => (k.soDon === 0 ? k.gtdh === 0 : true))).toBe(true);
  });

  it("top sản phẩm xếp giảm dần theo doanh thu", async () => {
    const top = await topSanPham(5);
    expect(top.length).toBeGreaterThan(0);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].doanhThu).toBeGreaterThanOrEqual(top[i].doanhThu);
    }
  });
});
