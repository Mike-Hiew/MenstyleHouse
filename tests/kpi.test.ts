import { describe, expect, it } from "vitest";
import { dinhDangThoiGian, phanHoiDauMs, quaHan, trungBinh, tyLeMuaLai } from "../src/lib/kpi";

const t0 = new Date("2026-10-29T08:00:00Z");
const sau = (phut: number) => new Date(t0.getTime() + phut * 60_000);

describe("phản hồi đầu", () => {
  it("lấy tin nhân viên sớm nhất, không phải tin đầu danh sách", () => {
    const t = {
      createdAt: t0,
      messages: [
        { isStaff: false, createdAt: t0 },
        { isStaff: true, createdAt: sau(90) },
        { isStaff: true, createdAt: sau(30) },
      ],
    };
    expect(phanHoiDauMs(t)).toBe(30 * 60_000);
  });

  it("chưa ai trả lời thì null và không kéo trung bình về 0", () => {
    expect(phanHoiDauMs({ createdAt: t0, messages: [{ isStaff: false, createdAt: t0 }] })).toBeNull();
    expect(trungBinh([null, 60_000, 180_000])).toBe(120_000);
    expect(trungBinh([null])).toBe(0);
  });
});

describe("quá hạn", () => {
  const now = sau(5 * 60);

  it("khách nói sau cùng và chờ quá 4 giờ là quá hạn", () => {
    expect(quaHan({ createdAt: t0, messages: [{ isStaff: false, createdAt: t0 }] }, now)).toBe(true);
  });

  it("nhân viên nói sau cùng thì không quá hạn, dù yêu cầu đã cũ", () => {
    const t = {
      createdAt: t0,
      messages: [
        { isStaff: false, createdAt: t0 },
        { isStaff: true, createdAt: sau(10) },
      ],
    };
    expect(quaHan(t, now)).toBe(false);
  });

  it("khách hỏi tiếp sau câu trả lời thì tính từ câu hỏi tiếp", () => {
    const t = {
      createdAt: t0,
      messages: [
        { isStaff: false, createdAt: t0 },
        { isStaff: true, createdAt: sau(10) },
        { isStaff: false, createdAt: sau(4 * 60) },
      ],
    };
    expect(quaHan(t, now)).toBe(false);
    expect(quaHan(t, sau(8 * 60 + 1))).toBe(true);
  });
});

describe("tỷ lệ mua lại", () => {
  it("chỉ tính trên khách đã mua ít nhất một đơn", () => {
    expect(tyLeMuaLai([0, 0, 1, 1, 2, 5])).toEqual({ phanTram: 50, muaLai: 2, daMua: 4 });
    expect(tyLeMuaLai([0, 0])).toEqual({ phanTram: 0, muaLai: 0, daMua: 0 });
  });
});

describe("định dạng thời gian", () => {
  it("phút, giờ, ngày", () => {
    expect(dinhDangThoiGian(20_000)).toBe("dưới 1 phút");
    expect(dinhDangThoiGian(35 * 60_000)).toBe("35 phút");
    expect(dinhDangThoiGian(160 * 60_000)).toBe("2 giờ 40");
    expect(dinhDangThoiGian(125 * 60_000)).toBe("2 giờ 05");
    expect(dinhDangThoiGian(180 * 60_000)).toBe("3 giờ");
    expect(dinhDangThoiGian(27 * 3_600_000)).toBe("1 ngày 3 giờ");
  });
});
