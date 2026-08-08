import { afterEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { phienConSong } from "../src/lib/session";
import { datLaiMatKhau, yeuCauDatLai } from "../src/server/password-reset";
import { db } from "../src/lib/db";

/**
 * Thu hồi phiên.
 *
 * Phiên là JWT nên không xoá từng cái được; mỗi người có một mốc
 * `sessionsValidFrom` và token phát trước mốc coi như chết. Hai đầu phải khớp
 * nhau: hàm so sánh ở đây, và chỗ đẩy mốc lên khi đổi mật khẩu.
 */

const GIAY = (d: Date) => Math.floor(d.getTime() / 1000);

describe("so mốc với iat", () => {
  const moc = new Date("2026-08-08T12:00:00.700Z");
  const song = { active: true, sessionsValidFrom: moc };

  it("token phát sau mốc thì sống", () => {
    expect(phienConSong(song, GIAY(moc) + 5)).toBe(true);
  });

  it("token phát trước mốc thì chết", () => {
    expect(phienConSong(song, GIAY(moc) - 1)).toBe(false);
  });

  it("token phát trong CÙNG giây với lúc đổi mật khẩu vẫn sống", () => {
    /*
     * Chỗ này nhìn như lỏng tay nhưng làm chặt hơn là hỏng: `iat` chỉ có độ mịn
     * tới giây. Đổi mật khẩu lúc 12:00:00.700 rồi đăng nhập lại lúc 12:00:00.900
     * cho token `iat = 12:00:00` — so nguyên mili-giây thì người vừa đổi mật
     * khẩu bị đá ra ngay tại giây họ đăng nhập.
     */
    expect(phienConSong(song, GIAY(moc))).toBe(true);
  });

  it("tài khoản tắt thì chết bất kể token mới cỡ nào", () => {
    expect(phienConSong({ active: false, sessionsValidFrom: moc }, GIAY(moc) + 99999)).toBe(false);
  });

  it("token không có iat thì không cho qua", () => {
    // Không chứng minh được là phát sau mốc thì coi như không.
    expect(phienConSong(song, undefined)).toBe(false);
  });
});

const rac: string[] = [];

afterEach(async () => {
  await db.user.deleteMany({ where: { id: { in: rac } } });
  rac.length = 0;
});

describe("đổi mật khẩu là giết phiên cũ", () => {
  it("đặt lại mật khẩu đẩy mốc lên, token cũ hết sống", async () => {
    const u = await db.user.create({
      data: {
        name: "Khách thu hồi phiên",
        phone: "0913" + String(Date.now()).slice(-6),
        email: `phien${Date.now()}@vidu.vn`,
        passwordHash: await bcrypt.hash("matkhaucu", 10),
        // Tài khoản có từ hôm qua, như mọi tài khoản đang dùng thật.
        sessionsValidFrom: new Date(Date.now() - 86_400_000),
      },
    });
    rac.push(u.id);

    // Token tưởng tượng, phát lúc người ta đăng nhập — tức là trước khi đổi.
    const iatCu = GIAY(new Date()) - 60;
    expect(phienConSong(u, iatCu)).toBe(true);

    const yc = await yeuCauDatLai(u.phone!);
    if (!yc.gui) throw new Error("phải gửi được");
    await datLaiMatKhau({ token: yc.token, password: "matkhaumoi1" });

    const sau = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(sau.sessionsValidFrom.getTime()).toBeGreaterThan(u.sessionsValidFrom.getTime());
    // Người chiếm được tài khoản đang ngồi trong đó bị đẩy ra cùng lúc.
    expect(phienConSong(sau, iatCu)).toBe(false);
  });

  it("mốc đi cùng transaction — mật khẩu đổi thì mốc cũng đổi", async () => {
    const u = await db.user.create({
      data: {
        name: "Khách thu hồi phiên 2",
        phone: "0914" + String(Date.now()).slice(-6),
        email: `phien2.${Date.now()}@vidu.vn`,
        passwordHash: await bcrypt.hash("matkhaucu", 10),
      },
    });
    rac.push(u.id);

    const yc = await yeuCauDatLai(u.phone!);
    if (!yc.gui) throw new Error("phải gửi được");
    await datLaiMatKhau({ token: yc.token, password: "matkhaumoi1" });

    const sau = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await bcrypt.compare("matkhaumoi1", sau.passwordHash!)).toBe(true);
    // Đổi được mật khẩu mà quên đẩy mốc là lỗ hổng im lặng nhất trong cả luồng.
    expect(phienConSong(sau, GIAY(u.sessionsValidFrom) - 1)).toBe(false);
  });
});
