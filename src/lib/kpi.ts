/**
 * Phép tính thuần cho thẻ số liệu ở màn Khách hàng và Hỗ trợ. Không đọc DB,
 * để test được từng luật mà không phải dựng dữ liệu.
 */

/** Mục tiêu phản hồi yêu cầu hỗ trợ: khách chờ quá mốc này là quá hạn. */
export const SLA_PHAN_HOI_MS = 4 * 3_600_000;

type TinNhan = { isStaff: boolean; createdAt: Date };

/**
 * Thời gian từ lúc khách gửi yêu cầu tới tin trả lời **đầu tiên** của nhân
 * viên. Chưa ai trả lời thì `null` — không tính vào trung bình, vì chưa có
 * con số nào để tính chứ không phải "trả lời ngay".
 */
export function phanHoiDauMs(t: { createdAt: Date; messages: TinNhan[] }): number | null {
  const dau = t.messages
    .filter((m) => m.isStaff)
    .reduce<Date | null>((min, m) => (!min || m.createdAt < min ? m.createdAt : min), null);
  return dau ? Math.max(0, dau.getTime() - t.createdAt.getTime()) : null;
}

/**
 * Yêu cầu đang mở mà **khách là người nói sau cùng** và đã chờ quá mục tiêu.
 *
 * Xét tin cuối chứ không xét tin đầu: nhân viên trả lời rồi, khách hỏi tiếp và
 * bị bỏ đó năm tiếng thì vẫn là đang bắt khách chờ.
 */
export function quaHan(
  t: { createdAt: Date; messages: TinNhan[] },
  now: Date,
  slaMs = SLA_PHAN_HOI_MS,
): boolean {
  const cuoi = t.messages.reduce<TinNhan | null>(
    (max, m) => (!max || m.createdAt > max.createdAt ? m : max),
    null,
  );
  if (cuoi?.isStaff) return false;
  const tu = cuoi?.createdAt ?? t.createdAt;
  return now.getTime() - tu.getTime() > slaMs;
}

/** Trung bình, bỏ qua `null`; không có số nào thì 0. */
export function trungBinh(xs: (number | null)[]): number {
  const co = xs.filter((x): x is number => x !== null);
  return co.length ? Math.round(co.reduce((a, b) => a + b, 0) / co.length) : 0;
}

/**
 * Tỷ lệ mua lại (%): trong số khách đã có ít nhất một đơn, bao nhiêu phần trăm
 * có từ hai đơn trở lên. Chưa ai mua thì 0.
 */
export function tyLeMuaLai(soDonMoiKhach: number[]): { phanTram: number; muaLai: number; daMua: number } {
  const daMua = soDonMoiKhach.filter((n) => n >= 1).length;
  const muaLai = soDonMoiKhach.filter((n) => n >= 2).length;
  return { phanTram: daMua ? Math.round((muaLai / daMua) * 100) : 0, muaLai, daMua };
}

/** "35 phút", "2 giờ 40", "1 ngày 3 giờ". Dưới một phút ghi "dưới 1 phút". */
export function dinhDangThoiGian(ms: number): string {
  const phut = Math.round(ms / 60_000);
  if (phut < 1) return "dưới 1 phút";
  if (phut < 60) return phut + " phút";
  const gio = Math.floor(phut / 60);
  if (gio < 24) {
    const du = phut % 60;
    return du ? `${gio} giờ ${String(du).padStart(2, "0")}` : `${gio} giờ`;
  }
  const ngay = Math.floor(gio / 24);
  const duGio = gio % 24;
  return duGio ? `${ngay} ngày ${duGio} giờ` : `${ngay} ngày`;
}
