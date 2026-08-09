/**
 * Quy tắc dùng điểm trừ vào tiền đơn.
 *
 * Tách khỏi tầng server để cả **form thanh toán** (hiện số tiền giảm ngay khi
 * khách kéo) lẫn **`placeOrder`** (tính lại và chốt) dùng đúng một hàm. Hai chỗ
 * tính khác nhau là khách thấy giảm 50.000 ₫ rồi bị tính 40.000 ₫, và không ai
 * giải thích được.
 */

export type LuatDiem = {
  /** Có cho dùng điểm không. */
  redeemEnabled: boolean;
  /** Một điểm đổi được bao nhiêu đồng. */
  pointValue: number;
  /** Trần phần trăm tiền hàng được trả bằng điểm. */
  redeemMaxPct: number;
};

/**
 * Số điểm **nhiều nhất** dùng được cho một đơn.
 *
 * Ba cái chặn, lấy cái nhỏ nhất: số điểm đang có · trần theo phần trăm tiền
 * hàng · và chính tiền hàng (không cho điểm trả cả phí ship, vì phí ship là
 * tiền cửa hàng trả cho bên thứ ba).
 */
export function diemToiDa(input: {
  soDiem: number;
  tienHang: number;
  luat: LuatDiem;
}): number {
  const { soDiem, tienHang, luat } = input;
  if (!luat.redeemEnabled || luat.pointValue <= 0 || soDiem <= 0 || tienHang <= 0) return 0;

  const tranTien = Math.floor((tienHang * Math.min(100, Math.max(0, luat.redeemMaxPct))) / 100);
  const tranTheoDiem = Math.floor(tranTien / luat.pointValue);
  return Math.max(0, Math.min(soDiem, tranTheoDiem));
}

/**
 * Chốt số điểm thực dùng và số tiền giảm tương ứng.
 *
 * Nhận số điểm khách xin dùng, cắt về mức cho phép. **Không ném lỗi khi xin
 * quá**: khách để giỏ vài ngày rồi quay lại, điểm có thể đã đổi vì một đơn khác
 * vừa được giao — chặn cả đơn vì chuyện đó là phạt nhầm người.
 */
export function tinhGiamTheoDiem(input: {
  xinDung: number;
  soDiem: number;
  tienHang: number;
  luat: LuatDiem;
}): { diemDung: number; tienGiam: number } {
  const toiDa = diemToiDa(input);
  const diemDung = Math.max(0, Math.min(Math.floor(input.xinDung || 0), toiDa));
  return { diemDung, tienGiam: diemDung * input.luat.pointValue };
}
