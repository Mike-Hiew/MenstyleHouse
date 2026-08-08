import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appUrl, guiMail, guiMailThat } from "../src/server/mail";
import {
  mailHoaDon,
  mailMoiNhanVien,
  mailTraLoiHoTro,
  mailXacNhanDon,
} from "../src/server/mail-templates";

/**
 * Lớp gửi mail.
 *
 * Hai điều đáng canh nhất **không phải** nội dung thư:
 *   1. Chưa có khoá thì phải nói rõ là **chưa gửi**. Im lặng báo "đã gửi" là
 *      kiểu hỏng tệ nhất — cửa hàng tưởng khách đã nhận hoá đơn.
 *   2. Gửi hỏng **không được ném lỗi**, vì nơi gọi là giữa luồng đặt đơn.
 */

const moiTruongGoc = { ...process.env };

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...moiTruongGoc };
  vi.restoreAllMocks();
});

describe("chọn nhà cung cấp", () => {
  it("mặc định là console — ghi log, không gửi đi đâu", async () => {
    delete process.env.MAIL_PROVIDER;
    expect(guiMailThat()).toBe(false);

    const ket = await guiMail({ to: "a@b.vn", subject: "x", body: "y", loai: "thu" });
    expect(ket).toMatchObject({ ok: true, provider: "console" });
  });

  it("giá trị lạ cũng rơi về console chứ không im lặng thử gửi", async () => {
    process.env.MAIL_PROVIDER = "mailgun-chua-lam";
    expect(guiMailThat()).toBe(false);
    expect(await guiMail({ to: "a@b.vn", subject: "x", body: "y", loai: "thu" })).toMatchObject({
      provider: "console",
    });
  });

  it("bật resend mà quên khoá thì báo hỏng, không giả vờ đã gửi", async () => {
    process.env.MAIL_PROVIDER = "resend";
    delete process.env.RESEND_API_KEY;

    const ket = await guiMail({ to: "a@b.vn", subject: "x", body: "y", loai: "thu" });
    expect(ket.ok).toBe(false);
    expect(ket.ok === false && ket.error).toMatch(/RESEND_API_KEY/);
  });

  it("nhà cung cấp chết thì trả về hỏng chứ KHÔNG ném lỗi", async () => {
    // Nơi gọi nằm giữa luồng đặt đơn: ném lỗi ở đây là khách thấy "không đặt
    // được đơn" trong khi đơn đã nằm trong DB.
    process.env.MAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_gia_dinh";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("mạng chết")));

    const ket = await guiMail({ to: "a@b.vn", subject: "x", body: "y", loai: "thu" });
    expect(ket).toMatchObject({ ok: false, provider: "resend" });
    expect(ket.ok === false && ket.error).toMatch(/mạng chết/);
  });

  it("nhà cung cấp trả lỗi HTTP cũng không ném", async () => {
    process.env.MAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_gia_dinh";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => "email không hợp lệ" }),
    );

    const ket = await guiMail({ to: "sai", subject: "x", body: "y", loai: "thu" });
    expect(ket.ok).toBe(false);
    expect(ket.ok === false && ket.error).toMatch(/422/);
  });

  it("gửi được thì trả về id của nhà cung cấp", async () => {
    process.env.MAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_gia_dinh";
    const goi = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "abc-123" }) });
    vi.stubGlobal("fetch", goi);

    const ket = await guiMail({ to: "a@b.vn", subject: "Chào", body: "Nội dung", loai: "thu" });
    expect(ket).toMatchObject({ ok: true, provider: "resend", id: "abc-123" });

    // Gửi cả bản thuần lẫn bản HTML: mail client nào cũng đọc được.
    const body = JSON.parse(goi.mock.calls[0][1].body);
    expect(body.text).toBe("Nội dung");
    expect(body.html).toContain("Nội dung");
    expect(body.to).toEqual(["a@b.vn"]);
  });

  it("thoát HTML trong nội dung — tên khách có dấu ngoặc không phá cấu trúc thư", async () => {
    process.env.MAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_gia_dinh";
    const goi = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", goi);

    await guiMail({ to: "a@b.vn", subject: "x", body: "<script>xin chào</script>", loai: "thu" });

    const body = JSON.parse(goi.mock.calls[0][1].body);
    expect(body.html).not.toContain("<script>");
    expect(body.html).toContain("&lt;script&gt;");
  });
});

describe("địa chỉ gốc trong mail", () => {
  it("lấy APP_URL, thiếu thì lấy AUTH_URL, thiếu nữa thì localhost", () => {
    process.env.APP_URL = "https://menstylehouse.vn/";
    expect(appUrl()).toBe("https://menstylehouse.vn");

    delete process.env.APP_URL;
    process.env.AUTH_URL = "https://du-phong.vn";
    expect(appUrl()).toBe("https://du-phong.vn");

    delete process.env.AUTH_URL;
    expect(appUrl()).toBe("http://localhost:3000");
  });
});

describe("nội dung từng loại thư", () => {
  /** Bắt lấy thư mà nhà cung cấp giả nhận được. */
  function batThu() {
    process.env.MAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_gia_dinh";
    process.env.APP_URL = "https://menstylehouse.vn";
    const goi = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", goi);
    return () => JSON.parse(goi.mock.calls[0][1].body) as { subject: string; text: string };
  }

  it("thư mời chứa đường dẫn tuyệt đối và hạn dùng", async () => {
    const doc = batThu();
    await mailMoiNhanVien({
      to: "nv@msh.vn",
      vaiTro: "Kế toán",
      token: "TOKEN123",
      nguoiMoi: "Quản trị viên",
      hotline: "1900 6060",
    });

    const thu = doc();
    expect(thu.text).toContain("https://menstylehouse.vn/nhan-loi-moi/TOKEN123");
    expect(thu.text).toContain("Kế toán");
    expect(thu.text).toContain("7 ngày");
  });

  it("thư xác nhận đơn có mã đơn và số tiền đúng định dạng đồng", async () => {
    const doc = batThu();
    await mailXacNhanDon({
      to: "khach@vidu.vn",
      ten: "Trần Văn A",
      maDon: "MSH-2026-00123",
      tong: 1_250_000,
      hinhThuc: "Thanh toán khi nhận hàng",
      hotline: "1900 6060",
    });

    const thu = doc();
    expect(thu.subject).toContain("MSH-2026-00123");
    expect(thu.text).toContain("1.250.000 ₫");
    expect(thu.text).toContain("/tra-cuu-don");
  });

  it("thư hỗ trợ mang theo mã yêu cầu để khách hỏi tiếp", async () => {
    const doc = batThu();
    await mailTraLoiHoTro({
      to: "khach@vidu.vn",
      maYeuCau: "TIC-2026-00007",
      tieuDe: "Đổi size áo",
      noiDung: "Cửa hàng hỗ trợ đổi size trong 15 ngày.",
      hotline: "1900 6060",
    });

    const thu = doc();
    expect(thu.subject).toContain("TIC-2026-00007");
    expect(thu.text).toContain("Đổi size áo");
    expect(thu.text).toContain("15 ngày");
  });

  it("thư hoá đơn có đủ ký hiệu và số", async () => {
    const doc = batThu();
    await mailHoaDon({
      to: "ketoan@congty.vn",
      nguoiMua: "Công ty TNHH ABC",
      kyHieu: "1C26TMS",
      so: "00000012",
      maDon: "MSH-2026-00123",
      tong: 4_060_000,
      hotline: "1900 6060",
    });

    const thu = doc();
    expect(thu.text).toContain("1C26TMS");
    expect(thu.text).toContain("00000012");
    expect(thu.text).toContain("4.060.000 ₫");
  });

  it("thư nào cũng nói rõ đừng trả lời vào địa chỉ này", async () => {
    const doc = batThu();
    await mailXacNhanDon({
      to: "a@b.vn",
      ten: "A",
      maDon: "MSH-1",
      tong: 1000,
      hinhThuc: "COD",
      hotline: "1900 6060",
    });
    expect(doc().text).toContain("không trả lời thư này");
  });
});
