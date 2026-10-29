import { afterEach, describe, expect, it } from "vitest";
import { danhGiaSchema, danhGiaTicket, DanhGiaError } from "../src/server/tickets";
import { db } from "../src/lib/db";

/**
 * Khách chấm mức hài lòng cho yêu cầu hỗ trợ. Ba luật đáng canh: chỉ chấm khi
 * cửa hàng đã trả lời, chấm một lần, và điểm luôn nằm trong 1–5 kể cả khi ai
 * đó ghi thẳng vào DB.
 */

const rac: string[] = [];

afterEach(async () => {
  await db.ticket.deleteMany({ where: { id: { in: rac.splice(0) } } });
});

async function taoYeuCau(daTraLoi: boolean) {
  const code = "TIC-TEST-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const t = await db.ticket.create({
    data: {
      code,
      subject: "Thử đánh giá",
      channel: "web",
      messages: {
        create: [
          { authorName: "Khách", isStaff: false, body: "Hỏi" },
          ...(daTraLoi ? [{ authorName: "Shop", isStaff: true, body: "Trả lời" }] : []),
        ],
      },
    },
  });
  rac.push(t.id);
  return t;
}

describe("đánh giá hỗ trợ", () => {
  it("chấm được sau khi cửa hàng trả lời, lưu điểm, góp ý và thời điểm", async () => {
    const t = await taoYeuCau(true);
    expect(await danhGiaTicket({ code: t.code.toLowerCase(), rating: 4, note: "Nhanh" })).toEqual({ ok: true });
    const sau = await db.ticket.findUniqueOrThrow({ where: { id: t.id } });
    expect(sau.rating).toBe(4);
    expect(sau.ratingNote).toBe("Nhanh");
    expect(sau.ratedAt).toBeInstanceOf(Date);
  });

  it("chưa ai trả lời thì không cho chấm", async () => {
    const t = await taoYeuCau(false);
    await expect(danhGiaTicket({ code: t.code, rating: 1 })).rejects.toBeInstanceOf(DanhGiaError);
    expect((await db.ticket.findUniqueOrThrow({ where: { id: t.id } })).rating).toBeNull();
  });

  it("chấm một lần: lần hai không đè, hai lần gửi cùng lúc chỉ một lần ăn", async () => {
    const t = await taoYeuCau(true);
    const ket = await Promise.allSettled([
      danhGiaTicket({ code: t.code, rating: 5 }),
      danhGiaTicket({ code: t.code, rating: 1 }),
    ]);
    expect(ket.filter((k) => k.status === "fulfilled")).toHaveLength(1);
    await expect(danhGiaTicket({ code: t.code, rating: 2 })).rejects.toBeInstanceOf(DanhGiaError);
    expect([5, 1]).toContain((await db.ticket.findUniqueOrThrow({ where: { id: t.id } })).rating);
  });

  it("mã không có thì trả null", async () => {
    expect(await danhGiaTicket({ code: "TIC-KHONG-CO", rating: 3 })).toBeNull();
  });

  it("form chỉ nhận 1–5 sao, DB cũng chặn ngoài khoảng", async () => {
    expect(danhGiaSchema.safeParse({ code: "TIC-1", rating: "0" }).success).toBe(false);
    expect(danhGiaSchema.safeParse({ code: "TIC-1", rating: "6" }).success).toBe(false);
    expect(danhGiaSchema.safeParse({ code: "TIC-1", rating: "5" }).success).toBe(true);
    const t = await taoYeuCau(true);
    await expect(db.ticket.update({ where: { id: t.id }, data: { rating: 50 } })).rejects.toThrow();
  });
});
