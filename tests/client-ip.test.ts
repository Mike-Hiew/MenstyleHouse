import { describe, expect, it } from "vitest";
import { chonIp } from "../src/lib/client-ip";

/**
 * Đọc IP khách để làm khoá rate limit.
 *
 * Bài quan trọng nhất ở đây là bài "khách bịa header": bản trước lấy phần tử
 * **đầu** của `X-Forwarded-For`, mà phần tử đầu là thứ khách tự gửi lên. Đổi
 * header mỗi lượt là bộ đếm về không — chính bộ kiểm trình duyệt của dự án này
 * đã dùng đúng mẹo đó để chạy nối nhau mà không đụng trần 5 lượt/giờ.
 */

/** Dựng nhanh một `Headers` giả. */
function hd(o: Record<string, string>): Pick<Headers, "get"> {
  const m = new Map(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (k: string) => m.get(k.toLowerCase()) ?? null };
}

const THAT = "203.0.113.9";

describe("không khai proxy thì không tin header nào", () => {
  it("bỏ qua X-Forwarded-For", () => {
    // Hỏng theo hướng chặt: mọi người chung một bộ đếm, còn hơn là mất giới hạn.
    expect(chonIp(hd({ "x-forwarded-for": THAT }), 0)).toBe("local");
  });

  it("bỏ qua cả X-Real-IP", () => {
    expect(chonIp(hd({ "x-real-ip": THAT }), 0)).toBe("local");
  });
});

describe("một proxy đứng trước, proxy nối vào cuối", () => {
  it("không có header thì là local", () => {
    expect(chonIp(hd({}), 1)).toBe("local");
  });

  it("chỉ mình proxy ghi thì lấy đúng IP đó", () => {
    expect(chonIp(hd({ "x-forwarded-for": THAT }), 1)).toBe(THAT);
  });

  it("KHÁCH BỊA header vẫn không đổi được kết quả", () => {
    /*
     * Đây là lỗ thủng của bản trước. Proxy nối IP thật vào **cuối**, nên đọc từ
     * phải sang là con số khách bịa không bao giờ được dùng.
     */
    const h = hd({ "x-forwarded-for": `1.2.3.4, ${THAT}` });
    expect(chonIp(h, 1)).toBe(THAT);
    expect(chonIp(h, 1)).not.toBe("1.2.3.4");
  });

  it("nhồi bao nhiêu phần tử vào đầu cũng vô ích", () => {
    const rac = Array.from({ length: 50 }, (_, i) => `9.9.9.${i}`).join(", ");
    expect(chonIp(hd({ "x-forwarded-for": `${rac}, ${THAT}` }), 1)).toBe(THAT);
  });

  it("dùng X-Real-IP khi không có X-Forwarded-For", () => {
    expect(chonIp(hd({ "x-real-ip": THAT }), 1)).toBe(THAT);
  });
});

describe("hai proxy đứng trước", () => {
  it("bỏ qua lớp biên, lấy đúng khách", () => {
    // client → CF (nối IP khách) → Caddy (nối IP của CF)
    const h = hd({ "x-forwarded-for": `1.2.3.4, ${THAT}, 172.68.0.1` });
    expect(chonIp(h, 2)).toBe(THAT);
  });

  it("khai 2 mà chuỗi chỉ có 1 thì về local, không đoán bừa", () => {
    expect(chonIp(hd({ "x-forwarded-for": THAT }), 2)).toBe("local");
  });
});

describe("header do biên ghi đè", () => {
  it("được ưu tiên hơn X-Forwarded-For", () => {
    const h = hd({ "cf-connecting-ip": THAT, "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(chonIp(h, 1, "cf-connecting-ip")).toBe(THAT);
  });

  it("thiếu thì rơi về X-Forwarded-For chứ không hỏng", () => {
    const h = hd({ "x-forwarded-for": `1.2.3.4, ${THAT}` });
    expect(chonIp(h, 1, "cf-connecting-ip")).toBe(THAT);
  });
});

describe("chặn giá trị bậy", () => {
  /*
   * Giá trị này đi thẳng vào khoá Redis. Không lọc thì khách nhét được chuỗi
   * dài tuỳ ý vào bộ nhớ của người khác.
   */
  it("bỏ chuỗi không phải IP", () => {
    expect(chonIp(hd({ "x-forwarded-for": "khong-phai-ip" }), 1)).toBe("local");
  });

  it("bỏ chuỗi quá dài", () => {
    expect(chonIp(hd({ "x-forwarded-for": "1".repeat(200) }), 1)).toBe("local");
  });

  it("vẫn nhận IPv6", () => {
    expect(chonIp(hd({ "x-forwarded-for": "2001:db8::1" }), 1)).toBe("2001:db8::1");
  });

  it("phần tử cuối bậy thì về local chứ không lùi sang phần tử khách bịa", () => {
    // Lùi một nấc là rơi đúng vào chỗ khách kiểm soát — thà không đếm theo IP.
    expect(chonIp(hd({ "x-forwarded-for": "1.2.3.4, rac" }), 1)).toBe("local");
  });
});
