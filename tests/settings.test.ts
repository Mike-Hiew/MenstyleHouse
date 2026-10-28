import { afterEach, describe, expect, it } from "vitest";
import {
  cuaHangSchema,
  luuCuaHang,
  luuThanThiet,
  luuThanhToan,
  settingsSchema,
  setQrImage,
  thanThietSchema,
  thanhToanSchema,
  updateSettings,
  vanChuyenSchema,
} from "../src/server/settings";
import { LastAdminError, listStaff, setUserRole } from "../src/server/admin/staff";
import { quoteShipping } from "../src/lib/shipping";
import { db } from "../src/lib/db";

/**
 * Cài đặt cửa hàng.
 *
 * Hai chỗ hỏng thì hỏng nặng và im lặng:
 *   1. Ngưỡng hạng đặt ngược → có hạng không bao giờ với tới được, chỉ lộ ra
 *      khi khách gọi lên hỏi vì sao mãi không lên hạng.
 *   2. Hạ người quản trị cuối cùng → khoá cửa từ bên trong, phải sửa thẳng DB.
 */

const goc = {
  shopName: "Công ty TNHH Men Style House",
  taxCode: "0316998221",
  address: "142 Nguyễn Văn Trỗi, P.8, Q. Phú Nhuận, TP.HCM",
  hotline: "1900 6060",
  email: "cskh@menstylehouse.vn",
  bankName: "Vietcombank — CN Tân Bình",
  bankAccount: "0071 0009 8877",
  bankOwner: "CTY TNHH MEN STYLE HOUSE",
  shipInnerCity: 22_000,
  shipProvince: 35_000,
  freeShipFrom: 500_000,
  vatRate: 8,
  holdMinutes: 120,
  // Chương trình hạng đang bật; tắt thì ba ngưỡng dưới không còn bị kiểm.
  tiersEnabled: true,
  redeemEnabled: true,
  pointValue: 1,
  redeemMaxPct: 50,
  tierSilver: 800_000,
  tierGold: 2_000_000,
  tierDiamond: 4_000_000,
  payCod: true,
  payBank: true,
};

afterEach(async () => {
  await db.storeSetting.update({ where: { id: "cua-hang" }, data: { ...goc, qrUrl: null, qrBlobId: null } });
});

describe("kiểm điều kiện cài đặt", () => {
  it("chặn ngưỡng hạng đặt ngược", () => {
    const nguoc = settingsSchema.safeParse({ ...goc, tierGold: 100_000 });
    expect(nguoc.success).toBe(false);
    expect(nguoc.error?.issues[0]?.message).toMatch(/cao hơn ngưỡng BẠC/);

    const nguoc2 = settingsSchema.safeParse({ ...goc, tierDiamond: 1_000_000 });
    expect(nguoc2.success).toBe(false);
    expect(nguoc2.error?.issues[0]?.message).toMatch(/cao hơn ngưỡng VÀNG/);
  });

  it("chặn tắt hết phương thức thanh toán", () => {
    // Tắt cả hai là khoá luôn cửa hàng: khách không đặt được đơn nào.
    const r = settingsSchema.safeParse({ ...goc, payCod: false, payBank: false });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/ít nhất một phương thức/);
  });

  it("chặn thuế suất và thời gian giữ đơn vô lý", () => {
    expect(settingsSchema.safeParse({ ...goc, vatRate: 99 }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...goc, holdMinutes: 5 }).success).toBe(false);
  });

  it("mã số thuế phải đúng dạng 10 số", () => {
    expect(settingsSchema.safeParse({ ...goc, taxCode: "123" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...goc, taxCode: "0316998221-001" }).success).toBe(true);
  });
});

/**
 * Màn Cài đặt chia thành bốn trang con từ M6.20, mỗi trang lưu riêng.
 *
 * Hai điều phải đúng, và cả hai đều hỏng im lặng nếu sai:
 *   1. Mỗi schema **chỉ đòi field của trang mình** — đòi thừa thì trang đó không
 *      bao giờ lưu được, vì form không hề gửi field của trang khác.
 *   2. Mỗi phép kiểm chéo nằm ở **đúng trang chứa field của nó** — đặt nhầm chỗ
 *      thì lỗi hiện ở một tab người ta không mở, hoặc không hiện ở đâu cả.
 */
describe("bốn schema theo trang", () => {
  const cuaHang = { shopName: goc.shopName, taxCode: goc.taxCode, address: goc.address, hotline: goc.hotline, email: goc.email };
  const thanhToan = { bankName: goc.bankName, bankAccount: goc.bankAccount, bankOwner: goc.bankOwner, payCod: true, payBank: true };
  const vanChuyen = { shipInnerCity: goc.shipInnerCity, shipProvince: goc.shipProvince, freeShipFrom: goc.freeShipFrom, vatRate: goc.vatRate, holdMinutes: goc.holdMinutes };
  const thanThiet = { redeemEnabled: true, pointValue: goc.pointValue, redeemMaxPct: goc.redeemMaxPct, tiersEnabled: true, tierSilver: goc.tierSilver, tierGold: goc.tierGold, tierDiamond: goc.tierDiamond };

  it("mỗi trang tự đứng được, không đòi field của trang khác", () => {
    expect(cuaHangSchema.safeParse(cuaHang).success).toBe(true);
    expect(thanhToanSchema.safeParse(thanhToan).success).toBe(true);
    expect(vanChuyenSchema.safeParse(vanChuyen).success).toBe(true);
    expect(thanThietSchema.safeParse(thanThiet).success).toBe(true);
  });

  it("ngưỡng hạng ngược chỉ bị chặn ở trang Khách thân thiết", () => {
    const r = thanThietSchema.safeParse({ ...thanThiet, tierGold: 100_000 });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/cao hơn ngưỡng BẠC/);

    // Trang khác không mang ba con số đó nên không có gì để kiểm.
    expect(cuaHangSchema.safeParse(cuaHang).success).toBe(true);
  });

  it("tắt hết thanh toán chỉ bị chặn ở trang Thanh toán", () => {
    const r = thanhToanSchema.safeParse({ ...thanhToan, payCod: false, payBank: false });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/ít nhất một phương thức/);
  });

  it("tắt chương trình hạng thì thôi bắt ngưỡng tăng dần", () => {
    // Tắt rồi thì ba con số kia không còn ý nghĩa; chặn lúc đó là chặn vì một
    // lỗi không tồn tại, và người ta không lưu nổi cái nút vừa bấm tắt.
    const r = thanThietSchema.safeParse({ ...thanThiet, tiersEnabled: false, tierGold: 1 });
    expect(r.success).toBe(true);
  });
});

describe("lưu theo trang không đụng trang khác", () => {
  it("lưu Cửa hàng không làm tắt phương thức thanh toán", async () => {
    /*
     * Đây là ca dễ hỏng nhất khi tách form: nếu hàm lưu spread cả input hoặc
     * chạm tới cờ boolean của trang khác, thì lưu tên cửa hàng cũng tắt luôn
     * COD — vì form trang Cửa hàng không hề gửi ô tick nào.
     */
    await luuCuaHang({ ...cuaHangSchema.parse({ ...goc, shopName: "Tên vừa đổi" }) });

    const s = await db.storeSetting.findUniqueOrThrow({ where: { id: "cua-hang" } });
    expect(s.shopName).toBe("Tên vừa đổi");
    expect([s.payCod, s.payBank, s.tiersEnabled, s.redeemEnabled]).toEqual([true, true, true, true]);
    // Và không đụng tới số của trang Vận chuyển.
    expect(s.vatRate).toBe(goc.vatRate);
  });

  it("bỏ tick COD ở trang Thanh toán thì tắt được thật", async () => {
    // Bỏ tick nghĩa là trường vắng mặt trong FormData → Zod cho `undefined` →
    // Prisma bỏ qua field `undefined`. Không ép `Boolean()` thì tắt mãi không
    // được mà chẳng có lỗi nào hiện ra.
    await luuThanhToan(thanhToanSchema.parse({ bankName: goc.bankName, bankAccount: goc.bankAccount, bankOwner: goc.bankOwner, payBank: "on" }));

    const s = await db.storeSetting.findUniqueOrThrow({ where: { id: "cua-hang" } });
    expect([s.payCod, s.payBank]).toEqual([false, true]);
  });

  it("bỏ tick chương trình hạng ở trang Thân thiết thì tắt được thật", async () => {
    await luuThanThiet(
      thanThietSchema.parse({
        pointValue: 1,
        redeemMaxPct: 50,
        tierSilver: goc.tierSilver,
        tierGold: goc.tierGold,
        tierDiamond: goc.tierDiamond,
      }),
    );

    const s = await db.storeSetting.findUniqueOrThrow({ where: { id: "cua-hang" } });
    expect([s.tiersEnabled, s.redeemEnabled]).toEqual([false, false]);
    // Thông tin cửa hàng không suy suyển.
    expect(s.shopName).toBe(goc.shopName);
  });
});

describe("cài đặt có tác dụng thật", () => {
  it("đổi phí ship thì bảng phí đổi theo", async () => {
    await updateSettings({ ...goc, shipInnerCity: 99_000, freeShipFrom: 10_000_000 });
    const s = await db.storeSetting.findUniqueOrThrow({ where: { id: "cua-hang" } });

    const bang = quoteShipping("TP. Hồ Chí Minh", 1_000_000, s);
    expect(bang.find((q) => q.carrier === "GHN")?.fee).toBe(99_000);

    // Trên ngưỡng miễn phí thì về 0.
    const mien = quoteShipping("TP. Hồ Chí Minh", 20_000_000, s);
    expect(mien.find((q) => q.carrier === "GHN")?.fee).toBe(0);
  });

  it("dòng cài đặt là duy nhất — không tạo được dòng thứ hai", async () => {
    // `id` có mặc định cố định nên `create` không truyền id sẽ đâm khoá chính.
    await expect(
      db.storeSetting.create({ data: goc as never }),
    ).rejects.toThrow();
    expect(await db.storeSetting.count()).toBe(1);
  });

  it("getSettings trả về đúng dòng đã lưu", async () => {
    await updateSettings({ ...goc, vatRate: 10 });
    expect((await db.storeSetting.findUniqueOrThrow({ where: { id: "cua-hang" } })).vatRate).toBe(10);
  });
});

describe("ảnh QR chuyển khoản", () => {
  it("gỡ QR KHÔNG dọn blob đang là ảnh sản phẩm", async () => {
    /*
     * Blob chia sẻ theo checksum: tấm QR hoàn toàn có thể trùng nội dung với
     * một ảnh sản phẩm. Dọn theo id là làm hỏng ảnh không liên quan.
     */
    const sp = await db.product.findFirstOrThrow({ select: { id: true } });
    const blob = await db.productImageBlob.create({
      data: {
        data: new Uint8Array([1, 2, 3]),
        width: 10,
        height: 10,
        byteSize: 3,
        checksum: "kiemthu" + Date.now(),
      },
      select: { id: true },
    });
    const anh = await db.productImage.create({
      data: { productId: sp.id, url: "/api/anh/x", alt: "kiểm thử", blobId: blob.id },
      select: { id: true },
    });

    await setQrImage({ url: "/api/anh/x", blobId: blob.id });
    await setQrImage(null);

    expect(await db.productImageBlob.findUnique({ where: { id: blob.id } })).not.toBeNull();

    await db.productImage.delete({ where: { id: anh.id } });
    await db.productImageBlob.delete({ where: { id: blob.id } });
  });

  it("gỡ QR CÓ dọn blob khi không ai khác dùng", async () => {
    const blob = await db.productImageBlob.create({
      data: {
        data: new Uint8Array([9, 9, 9]),
        width: 10,
        height: 10,
        byteSize: 3,
        checksum: "qrrieng" + Date.now(),
      },
      select: { id: true },
    });

    await setQrImage({ url: "/api/anh/qr", blobId: blob.id });
    await setQrImage(null);

    expect(await db.productImageBlob.findUnique({ where: { id: blob.id } })).toBeNull();
  });

  it("gỡ QR thì xoá hẳn url và blobId khỏi cài đặt", async () => {
    await setQrImage({ url: "/api/anh/abc-123.webp", blobId: "khong-co-that" });
    let s = await db.storeSetting.findUniqueOrThrow({ where: { id: "cua-hang" } });
    expect(s.qrUrl).toBe("/api/anh/abc-123.webp");

    await setQrImage(null);
    s = await db.storeSetting.findUniqueOrThrow({ where: { id: "cua-hang" } });
    expect(s.qrUrl).toBeNull();
    expect(s.qrBlobId).toBeNull();
  });
});

describe("phân quyền", () => {
  it("không hạ được người quản trị cuối cùng", async () => {
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    expect(admins.length).toBeGreaterThan(0);

    // Hạ hết trừ người cuối, rồi thử hạ nốt người cuối.
    for (const a of admins.slice(1)) await setUserRole(a.id, "STAFF");
    await expect(setUserRole(admins[0].id, "STAFF")).rejects.toBeInstanceOf(LastAdminError);

    for (const a of admins.slice(1)) await setUserRole(a.id, "ADMIN");
  });

  it("nâng người khác lên quản trị rồi mới hạ được người cũ", async () => {
    const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" }, select: { id: true } });
    const staff = await db.user.findFirstOrThrow({ where: { role: "STAFF" }, select: { id: true } });

    await setUserRole(staff.id, "ADMIN");
    await expect(setUserRole(admin.id, "STAFF")).resolves.toMatchObject({ role: "STAFF" });

    await setUserRole(admin.id, "ADMIN");
    await setUserRole(staff.id, "STAFF");
  });

  it("danh sách chỉ gồm nhân viên, không có khách", async () => {
    const ds = await listStaff();
    expect(ds.length).toBeGreaterThan(0);
    expect(ds.every((m) => m.role !== "CUSTOMER")).toBe(true);
  });
});
