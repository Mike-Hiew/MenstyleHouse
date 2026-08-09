/**
 * Lấy IP của khách để làm khoá cho `rateLimit`.
 *
 * Bản trước đọc `x-forwarded-for` rồi lấy **phần tử đầu tiên**, và đó là một lỗ
 * thủng: `X-Forwarded-For` do khách gửi lên cũng được, còn reverse proxy thì
 * **nối thêm** vào chứ không ghi đè. Khách gửi `X-Forwarded-For: 1.2.3.4` thì
 * proxy biến nó thành `1.2.3.4, <ip-thật>` — phần tử đầu chính là con số khách
 * tự bịa. Đổi header mỗi lượt là bộ đếm về không, và mọi giới hạn dựa trên IP
 * (dội thư đặt lại mật khẩu, dò mã đơn của khách vãng lai) coi như không có.
 *
 * Đọc **từ phải sang**: proxy nối vào cuối, nên IP thật luôn nằm ở vị trí thứ
 * `SO_PROXY` tính từ cuối lên. Khách có nhồi bao nhiêu phần tử vào đầu chuỗi
 * cũng không đẩy được vị trí đó.
 */

/** Số proxy đứng trước app. 0 = không tin `X-Forwarded-For`. */
export const SO_PROXY_MAC_DINH = 0;

/**
 * Trông có giống một địa chỉ IP không.
 *
 * Giá trị này đi thẳng vào khoá Redis. Không chặn thì khách nhét được một chuỗi
 * dài tuỳ ý vào bộ nhớ của người khác.
 */
function giongIp(v: string): boolean {
  return v.length > 0 && v.length <= 45 && /^[0-9a-fA-F:.]+$/.test(v);
}

/**
 * Phần thuần để test được: không đọc biến môi trường, không đụng `headers()`.
 *
 * @param soProxy    số proxy tin cậy đứng trước app
 * @param headerTin  tên header do biên đặt và **ghi đè** (ví dụ `cf-connecting-ip`)
 */
export function chonIp(
  h: Pick<Headers, "get">,
  soProxy: number,
  headerTin?: string,
): string {
  /*
   * Header của biên được ưu tiên vì nó do chính lớp biên ghi đè, khách gửi lên
   * cũng bị thay. Chỉ đúng khi app **không** vào thẳng được từ Internet — vào
   * thẳng được thì header này cũng bịa được như mọi header khác.
   */
  if (headerTin) {
    const v = h.get(headerTin)?.trim() ?? "";
    if (giongIp(v)) return v;
  }

  if (soProxy > 0) {
    const xs = (h.get("x-forwarded-for") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    /*
     * Chuỗi ngắn hơn số proxy đã khai nghĩa là request không đi qua đủ số lớp
     * đã cấu hình. Đừng đoán bừa lấy phần tử nào — trả về "local" để mọi request
     * kiểu đó dùng chung một bộ đếm: chặt quá thì phiền, hở ra là mất tác dụng.
     */
    const i = xs.length - soProxy;
    if (i >= 0 && giongIp(xs[i])) return xs[i];
  }

  /* Do nginx đặt, và nginx ghi đè chứ không nối — chỉ tin khi đã khai có proxy. */
  if (soProxy > 0) {
    const real = h.get("x-real-ip")?.trim() ?? "";
    if (giongIp(real)) return real;
  }

  return "local";
}

/**
 * Bản dùng thật: đọc cấu hình từ biến môi trường.
 *
 * Mặc định `TRUSTED_PROXY_HOPS` là 0 — **không khai thì không tin header nào**.
 * Hỏng theo hướng chặt (mọi người chung một bộ đếm) chứ không hở: khai thiếu
 * thì cùng lắm là giới hạn nhầm, còn tin bừa thì giới hạn biến mất.
 */
export function docIpKhach(h: Pick<Headers, "get">): string {
  const soProxy = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "", 10);
  return chonIp(
    h,
    Number.isFinite(soProxy) && soProxy > 0 ? soProxy : SO_PROXY_MAC_DINH,
    process.env.TRUSTED_IP_HEADER?.toLowerCase().trim() || undefined,
  );
}
