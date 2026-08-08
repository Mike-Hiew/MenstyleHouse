import { afterEach, describe, expect, it } from "vitest";
import { conThieuLenHang, tierFor } from "../src/lib/tiers";
import { createCustomer, getCustomer, listCustomers, PhoneTakenError } from "../src/server/admin/customers";
import { parseTableQuery } from "../src/lib/table-params";
import { db } from "../src/lib/db";

/**
 * Phân hạng khách là con số khách đếm từng đồng rồi gọi lên hỏi khi thấy lệch,
 * nên biên ngưỡng phải khoá chặt. Mockup dùng dấu **lớn hơn chặt**: tiêu đúng
 * 4.000.000 ₫ vẫn là VÀNG.
 */

const rac: string[] = [];
const donRac: string[] = [];

afterEach(async () => {
  await db.order.deleteMany({ where: { id: { in: donRac } } });
  await db.user.deleteMany({ where: { id: { in: rac } } });
  rac.length = 0;
  donRac.length = 0;
});

/** Ngưỡng mặc định mà migration đặt vào dòng cài đặt. */
const NGUONG = { tierSilver: 800_000, tierGold: 2_000_000, tierDiamond: 4_000_000 };

describe("ngưỡng phân hạng", () => {
  it.each([
    [0, "MỚI"],
    [800_000, "MỚI"],
    [800_001, "BẠC"],
    [2_000_000, "BẠC"],
    [2_000_001, "VÀNG"],
    [4_000_000, "VÀNG"],
    [4_000_001, "KIM CƯƠNG"],
    [50_000_000, "KIM CƯƠNG"],
  ])("chi %i ₫ → %s", (tien, hang) => expect(tierFor(tien, NGUONG)).toBe(hang));

  it("đúng bằng ngưỡng thì CHƯA lên hạng", () => {
    // Chỗ này sai một dấu `=` là hàng nghìn khách nhảy hạng sai.
    for (const moc of Object.values(NGUONG)) {
      expect(tierFor(moc, NGUONG)).not.toBe(tierFor(moc + 1, NGUONG));
    }
  });

  it("tính đúng số tiền còn thiếu để lên hạng", () => {
    expect(conThieuLenHang(0, NGUONG)).toEqual({ hang: "BẠC", thieu: 800_001 });
    expect(conThieuLenHang(800_001, NGUONG)).toEqual({ hang: "VÀNG", thieu: 1_200_000 });
    expect(conThieuLenHang(4_000_001, NGUONG)).toBeNull();
  });

  it("thiếu đúng số đó thì lên hạng thật", () => {
    for (const tien of [0, 500_000, 1_000_000, 3_000_000]) {
      const con = conThieuLenHang(tien, NGUONG);
      expect(con).not.toBeNull();
      expect(tierFor(tien + con!.thieu, NGUONG)).toBe(con!.hang);
    }
  });
});

/** Khách kèm đơn, để kiểm phần gom chi tiêu. */
async function khachCoDon(donHang: { total: number; status: "DELIVERED" | "CANCELLED"; thangTruoc?: number }[]) {
  const rieng = Math.abs(Number(process.hrtime.bigint() % 100000000n));
  const u = await db.user.create({
    data: { name: "Khách kiểm thử " + rieng, phone: "09" + String(rieng).padStart(8, "0").slice(0, 8), role: "CUSTOMER" },
    select: { id: true },
  });
  rac.push(u.id);

  for (const d of donHang) {
    const ngay = new Date();
    if (d.thangTruoc) ngay.setMonth(ngay.getMonth() - d.thangTruoc);
    const o = await db.order.create({
      data: {
        code: "TEST-KH-" + Math.abs(Number(process.hrtime.bigint() % 100000000n)),
        userId: u.id,
        isGuest: false,
        status: d.status,
        paymentMethod: "COD",
        createdAt: ngay,
        receiver: "Khách kiểm thử",
        phone: "0900123456",
        province: "TP.HCM",
        district: "Phú Nhuận",
        ward: "Phường 8",
        street: "142 Nguyễn Văn Trỗi",
        subtotal: d.total,
        total: d.total,
      },
      select: { id: true },
    });
    donRac.push(o.id);
  }

  return u;
}

describe("ngưỡng đọc từ cài đặt, không phải hằng số", () => {
  it("đổi ngưỡng thì hạng của cùng một khách đổi theo", async () => {
    const u = await khachCoDon([{ total: 1_500_000, status: "DELIVERED" }]);
    expect((await getCustomer(u.id))?.hang).toBe("BẠC");

    const cu = await db.storeSetting.findUniqueOrThrow({ where: { id: "cua-hang" } });
    await db.storeSetting.update({
      where: { id: "cua-hang" },
      data: { tierSilver: 100_000, tierGold: 1_000_000, tierDiamond: 3_000_000 },
    });

    // `getSettings` bọc trong cache() của React — mỗi lần chạy test là một
    // ngữ cảnh mới nên không dính bản cũ, nhưng vẫn đọc lại cho chắc.
    expect((await getCustomer(u.id))?.hang).toBe("VÀNG");

    await db.storeSetting.update({
      where: { id: "cua-hang" },
      data: { tierSilver: cu.tierSilver, tierGold: cu.tierGold, tierDiamond: cu.tierDiamond },
    });
  });
});

describe("gom chi tiêu", () => {
  it("chỉ tính đơn chưa huỷ — cùng luật với báo cáo doanh thu", async () => {
    const u = await khachCoDon([
      { total: 1_000_000, status: "DELIVERED" },
      { total: 9_000_000, status: "CANCELLED" },
    ]);

    const ho = await getCustomer(u.id);
    expect(ho?.chiTieu).toBe(1_000_000);
    expect(ho?.soDon).toBe(1);
    // Nếu đơn huỷ 9 triệu bị tính vào, khách này đã nhảy lên KIM CƯƠNG.
    expect(ho?.hang).toBe("BẠC");
    // Đơn huỷ vẫn hiện trong lịch sử, chỉ không tính tiền.
    expect(ho?.orders).toHaveLength(2);
  });

  it("đơn quá 12 tháng không tính vào hạng", async () => {
    const u = await khachCoDon([
      { total: 5_000_000, status: "DELIVERED", thangTruoc: 14 },
      { total: 900_000, status: "DELIVERED" },
    ]);

    const ho = await getCustomer(u.id);
    expect(ho?.chiTieu).toBe(900_000);
    expect(ho?.hang).toBe("BẠC");
  });

  it("bảng danh sách ra cùng con số với hồ sơ", async () => {
    const u = await khachCoDon([{ total: 2_500_000, status: "DELIVERED" }]);
    const ho = await getCustomer(u.id);

    const { rows } = await listCustomers(parseTableQuery({ q: ho!.name }));
    const dong = rows.find((r) => r.id === u.id);

    expect(dong?.chiTieu).toBe(ho?.chiTieu);
    expect(dong?.soDon).toBe(ho?.soDon);
    expect(dong?.hang).toBe("VÀNG");
  });

  it("khách chưa mua gì vẫn hiện, hạng MỚI", async () => {
    const u = await khachCoDon([]);
    const { rows } = await listCustomers(parseTableQuery({ q: "Khách kiểm thử" }));
    const dong = rows.find((r) => r.id === u.id);
    expect(dong?.chiTieu).toBe(0);
    expect(dong?.hang).toBe("MỚI");
  });
});

describe("tạo tài khoản cho khách mua tại cửa hàng", () => {
  it("trả mật khẩu tạm và lưu bản băm, không lưu bản rõ", async () => {
    const phone = "0977" + String(Math.abs(Number(process.hrtime.bigint() % 1000000n))).padStart(6, "0");
    const { id, matKhauTam } = await createCustomer({ name: "Khách quầy", phone, email: null });
    rac.push(id);

    expect(matKhauTam).toHaveLength(8);
    // Bỏ ký tự dễ đọc nhầm qua điện thoại.
    expect(matKhauTam).not.toMatch(/[01OIl]/);

    const u = await db.user.findUniqueOrThrow({ where: { id }, select: { passwordHash: true, role: true } });
    expect(u.role).toBe("CUSTOMER");
    expect(u.passwordHash).toBeTruthy();
    expect(u.passwordHash).not.toBe(matKhauTam);
  });

  it("trùng số điện thoại thì chặn", async () => {
    const phone = "0966" + String(Math.abs(Number(process.hrtime.bigint() % 1000000n))).padStart(6, "0");
    const { id } = await createCustomer({ name: "Khách A", phone, email: null });
    rac.push(id);

    await expect(createCustomer({ name: "Khách B", phone, email: null })).rejects.toBeInstanceOf(
      PhoneTakenError,
    );
  });
});
