import { describe, expect, it } from "vitest";
import { docSo, docTien } from "../src/lib/doc-so";

/**
 * Dòng "Số tiền bằng chữ" là chỗ khách và kế toán soi kỹ nhất trên hoá đơn —
 * sai một chữ là hoá đơn phải huỷ và lập lại. Khoá từng luật đọc một.
 */

describe("số nhỏ", () => {
  it.each([
    [0, "không"],
    [1, "một"],
    [5, "năm"],
    [9, "chín"],
    [10, "mười"],
    [11, "mười một"],
    [15, "mười lăm"],
    [19, "mười chín"],
  ])("%i → %s", (n, chu) => expect(docSo(n)).toBe(chu));

  it("từ 20 trở lên dùng 'mươi', và 1/4/5 đổi thành mốt/tư/lăm", () => {
    expect(docSo(20)).toBe("hai mươi");
    expect(docSo(21)).toBe("hai mươi mốt");
    expect(docSo(24)).toBe("hai mươi tư");
    expect(docSo(25)).toBe("hai mươi lăm");
    expect(docSo(27)).toBe("hai mươi bảy");
    expect(docSo(91)).toBe("chín mươi mốt");
  });

  it("mười lăm khác hai mươi lăm ở chỗ 'mười' không có 'mươi'", () => {
    expect(docSo(15)).toBe("mười lăm");
    expect(docSo(25)).toBe("hai mươi lăm");
    // Và 11 là "mười một" chứ không "mười mốt".
    expect(docSo(11)).toBe("mười một");
  });
});

describe("hàng trăm và số 'lẻ'", () => {
  it.each([
    [100, "một trăm"],
    [105, "một trăm lẻ năm"],
    [110, "một trăm mười"],
    [115, "một trăm mười lăm"],
    [121, "một trăm hai mươi mốt"],
    [500, "năm trăm"],
    [999, "chín trăm chín mươi chín"],
  ])("%i → %s", (n, chu) => expect(docSo(n)).toBe(chu));
});

describe("nhóm nghìn, triệu, tỷ", () => {
  it.each([
    [1000, "một nghìn"],
    [1500, "một nghìn năm trăm"],
    [459000, "bốn trăm năm mươi chín nghìn"],
    [1000000, "một triệu"],
    [1234567, "một triệu hai trăm ba mươi tư nghìn năm trăm sáu mươi bảy"],
    [2000000000, "hai tỷ"],
  ])("%i → %s", (n, chu) => expect(docSo(n)).toBe(chu));

  it("nhóm rỗng ở giữa thì bỏ hẳn, không đọc 'không nghìn'", () => {
    expect(docSo(1_000_567)).toBe("một triệu năm trăm sáu mươi bảy");
    expect(docSo(2_000_000)).toBe("hai triệu");
  });

  it("nhóm sau thiếu hàng trăm vẫn phải đọc 'không trăm'", () => {
    // Bỏ "không trăm" thì 1.000.067 nghe hệt 1.000.000 + 67 ở hàng nào cũng được.
    expect(docSo(1_000_067)).toBe("một triệu không trăm sáu mươi bảy");
    expect(docSo(1_000_005)).toBe("một triệu không trăm lẻ năm");
    expect(docSo(1_067_000)).toBe("một triệu không trăm sáu mươi bảy nghìn");
  });

  it("nhóm cao nhất thì không đọc 'không trăm'", () => {
    expect(docSo(67_000)).toBe("sáu mươi bảy nghìn");
    expect(docSo(5)).toBe("năm");
  });
});

describe("dòng in trên hoá đơn", () => {
  it("viết hoa chữ đầu và có đuôi 'đồng'", () => {
    expect(docTien(459_000)).toBe("Bốn trăm năm mươi chín nghìn đồng");
    expect(docTien(0)).toBe("Không đồng");
    expect(docTien(1_234_567)).toBe(
      "Một triệu hai trăm ba mươi tư nghìn năm trăm sáu mươi bảy đồng",
    );
  });
});

describe("biên", () => {
  it("chặn số không nguyên — tiền là Int đồng, không có phần lẻ", () => {
    expect(() => docSo(1000.5)).toThrow();
  });

  it("đọc được tới trần Int32, vượt hàng tỷ thì báo lỗi", () => {
    expect(() => docSo(2_147_483_647)).not.toThrow();
    expect(() => docSo(1_000_000_000_000)).toThrow();
  });

  it("số âm đọc được, dùng khi in dòng hoàn tiền", () => {
    expect(docSo(-5000)).toBe("âm năm nghìn");
  });
});
