import { afterEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import {
  datLaiMatKhau,
  docYeuCau,
  ResetInvalidError,
  yeuCauDatLai,
} from "../src/server/password-reset";
import { registerSchema } from "../src/server/accounts";
import { db } from "../src/lib/db";

/**
 * Đặt lại mật khẩu là đường vào tài khoản **không cần biết mật khẩu cũ**, nên
 * mỗi luật ở đây hỏng là mất tài khoản chứ không phải hiển thị xấu:
 *
 *   - rò rỉ "tài khoản này có tồn tại" → form thành máy dò số điện thoại;
 *   - token dùng được lần hai → ai đọc được thư cũ vẫn vào lại được;
 *   - token cũ còn sống sau khi xin cái mới → nhiều chìa cùng mở một cửa.
 */

const rac: string[] = [];

afterEach(async () => {
  // Xoá user là xoá luôn PasswordReset (onDelete: Cascade).
  await db.user.deleteMany({ where: { id: { in: rac } } });
  rac.length = 0;
});

let dem = 0;

async function taoUser(opts: { email?: string | null; active?: boolean } = {}) {
  dem += 1;
  const u = await db.user.create({
    data: {
      name: "Khách thử " + dem,
      phone: "0977" + String(100000 + dem).slice(-6),
      email: opts.email === undefined ? `thu${dem}.${Date.now()}@vidu.vn` : opts.email,
      passwordHash: await bcrypt.hash("matkhaucu", 10),
      active: opts.active ?? true,
    },
  });
  rac.push(u.id);
  return u;
}

/**
 * Số chắc chắn chưa ai dùng.
 *
 * Bịa một số trông-có-vẻ-lạ là cách tôi vừa viết sai: `0900000001` hoá ra là số
 * của tài khoản quản trị trong seed, nên bài kiểm "số lạ" lại đi tra đúng một
 * tài khoản có thật. Hỏi thẳng cơ sở dữ liệu thì không đoán mò nữa.
 */
async function soChuaDung(): Promise<string> {
  for (let i = 0; i < 50; i += 1) {
    const so = "0911" + String(200000 + i).slice(-6);
    if (!(await db.user.findUnique({ where: { phone: so }, select: { id: true } }))) return so;
  }
  throw new Error("không tìm được số trống để kiểm thử");
}

describe("xin đường dẫn đặt lại", () => {
  it("tìm được theo số điện thoại và theo email", async () => {
    const u = await taoUser();

    const theoSo = await yeuCauDatLai(u.phone!);
    expect(theoSo.gui).toBe(true);

    const theoMail = await yeuCauDatLai(u.email!.toUpperCase());
    // Gõ hoa cũng phải ra — người ta hay để bàn phím tự viết hoa chữ đầu.
    expect(theoMail.gui).toBe(true);
  });

  it("số lạ trả về đúng kiểu 'không gửi', không ném lỗi", async () => {
    // Ném lỗi ở đây cũng là một cách rò rỉ: nơi gọi trả 500 thay vì 200.
    await expect(yeuCauDatLai(await soChuaDung())).resolves.toEqual({ gui: false });
    await expect(yeuCauDatLai("khong-co@dau-ca.vn")).resolves.toEqual({ gui: false });
  });

  it("tài khoản không có email thì không gửi được đi đâu", async () => {
    const u = await taoUser({ email: null });
    expect(await yeuCauDatLai(u.phone!)).toEqual({ gui: false });
  });

  it("tài khoản đã tắt thì không cho lấy lại mật khẩu", async () => {
    // Tắt tài khoản là để chặn người đó vào; cho đặt lại mật khẩu là mở lại cửa.
    const u = await taoUser({ active: false });
    expect(await yeuCauDatLai(u.phone!)).toEqual({ gui: false });
  });

  it("xin cái mới thì cái cũ chết ngay", async () => {
    const u = await taoUser();
    const cu = await yeuCauDatLai(u.phone!);
    const moi = await yeuCauDatLai(u.phone!);
    expect(cu.gui && moi.gui).toBe(true);
    if (!cu.gui || !moi.gui) throw new Error("phải gửi được");

    expect(await docYeuCau(cu.token)).toBeNull();
    expect(await docYeuCau(moi.token)).not.toBeNull();

    await expect(datLaiMatKhau({ token: cu.token, password: "matkhaumoi1" })).rejects.toThrow(
      ResetInvalidError,
    );
  });

  it("token dài và ngẫu nhiên, không đoán được", async () => {
    const u1 = await taoUser();
    const u2 = await taoUser();
    const a = await yeuCauDatLai(u1.phone!);
    const b = await yeuCauDatLai(u2.phone!);
    if (!a.gui || !b.gui) throw new Error("phải gửi được");

    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(32);
    // base64url: không có ký tự phải mã hoá lại khi nhét vào URL.
    expect(a.token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("dùng đường dẫn", () => {
  it("đổi được mật khẩu, và mật khẩu cũ hết tác dụng", async () => {
    const u = await taoUser();
    const yc = await yeuCauDatLai(u.phone!);
    if (!yc.gui) throw new Error("phải gửi được");

    await datLaiMatKhau({ token: yc.token, password: "matkhaumoi1" });

    const sau = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await bcrypt.compare("matkhaumoi1", sau.passwordHash!)).toBe(true);
    expect(await bcrypt.compare("matkhaucu", sau.passwordHash!)).toBe(false);
  });

  it("dùng một lần — bấm lại lần hai là hỏng", async () => {
    const u = await taoUser();
    const yc = await yeuCauDatLai(u.phone!);
    if (!yc.gui) throw new Error("phải gửi được");

    await datLaiMatKhau({ token: yc.token, password: "matkhaumoi1" });
    await expect(datLaiMatKhau({ token: yc.token, password: "keochenlen" })).rejects.toThrow(
      ResetInvalidError,
    );

    // Và mật khẩu vẫn là cái đặt ở lần đầu, không bị lần hai ghi đè.
    const sau = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await bcrypt.compare("matkhaumoi1", sau.passwordHash!)).toBe(true);
  });

  it("hết hạn thì không dùng được nữa", async () => {
    const u = await taoUser();
    const yc = await yeuCauDatLai(u.phone!);
    if (!yc.gui) throw new Error("phải gửi được");

    await db.passwordReset.update({
      where: { token: yc.token },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    expect(await docYeuCau(yc.token)).toBeNull();
    await expect(datLaiMatKhau({ token: yc.token, password: "matkhaumoi1" })).rejects.toThrow(
      ResetInvalidError,
    );
  });

  it("token bịa ra thì hỏng chứ không đổi bừa mật khẩu ai đó", async () => {
    expect(await docYeuCau("khong-he-ton-tai")).toBeNull();
    await expect(datLaiMatKhau({ token: "khong-he-ton-tai", password: "abcdefgh" })).rejects.toThrow(
      ResetInvalidError,
    );
  });

  it("tài khoản bị tắt sau khi đã gửi thư thì đường dẫn chết theo", async () => {
    // Khoảng giữa lúc gửi thư và lúc bấm: admin tắt tài khoản. Nếu vẫn đổi được
    // thì lệnh tắt của admin bị vô hiệu.
    const u = await taoUser();
    const yc = await yeuCauDatLai(u.phone!);
    if (!yc.gui) throw new Error("phải gửi được");

    await db.user.update({ where: { id: u.id }, data: { active: false } });

    expect(await docYeuCau(yc.token)).toBeNull();
    await expect(datLaiMatKhau({ token: yc.token, password: "matkhaumoi1" })).rejects.toThrow(
      ResetInvalidError,
    );
  });

  it("docYeuCau chỉ trả tên và email, không lộ id hay hash", async () => {
    const u = await taoUser();
    const yc = await yeuCauDatLai(u.phone!);
    if (!yc.gui) throw new Error("phải gửi được");

    const doc = await docYeuCau(yc.token);
    // Trang đặt lại là trang **ai cầm link cũng mở được**; đừng bày thêm gì.
    expect(Object.keys(doc ?? {}).sort()).toEqual(["email", "ten"]);
  });
});

describe("đăng ký nhập mật khẩu hai lần", () => {
  const co = {
    name: "Nguyễn Văn A",
    phone: "0903128447",
    email: "",
    password: "matkhau123",
  };

  it("hai lần khớp thì qua", () => {
    expect(registerSchema.safeParse({ ...co, password2: "matkhau123" }).success).toBe(true);
  });

  it("gõ lệch một ký tự là chặn, và báo đúng vào ô nhập lại", () => {
    // Không chặn ở đây thì người ta tạo tài khoản với mật khẩu mình không biết,
    // rồi khoá luôn từ ngày đầu.
    const ket = registerSchema.safeParse({ ...co, password2: "matkhau124" });
    expect(ket.success).toBe(false);
    if (ket.success) return;
    expect(ket.error.issues[0].path).toEqual(["password2"]);
  });

  it("bỏ trống ô nhập lại cũng không qua", () => {
    expect(registerSchema.safeParse({ ...co, password2: "" }).success).toBe(false);
  });
});
