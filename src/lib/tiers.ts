/**
 * Phân hạng khách theo tổng chi tiêu 12 tháng.
 *
 * Ngưỡng **do cửa hàng đặt** ở `/admin/cai-dat`, nên mọi hàm ở đây nhận ngưỡng
 * làm tham số thay vì đọc hằng số. Giữ một bản mặc định trong file này rồi lỡ
 * quên truyền vào là có chỗ phân hạng theo số cũ trong khi chỗ khác theo số
 * mới — hai màn hình cùng một khách ra hai hạng khác nhau.
 *
 * Thuần, không đụng DB, để test được từng biên một.
 */

export type Tier = "KIM CƯƠNG" | "VÀNG" | "BẠC" | "MỚI";

export type TierThresholds = {
  /** Vượt qua mức này là BẠC. */
  tierSilver: number;
  tierGold: number;
  tierDiamond: number;
};

/**
 * So sánh bằng dấu **lớn hơn chặt**, đúng như mockup: tiêu đúng bằng ngưỡng thì
 * chưa lên hạng. Nghe như chuyện nhỏ, nhưng đây là con số khách đếm từng đồng
 * rồi gọi lên hỏi khi thấy lệch.
 */
export function tierFor(spend12m: number, t: TierThresholds): Tier {
  if (spend12m > t.tierDiamond) return "KIM CƯƠNG";
  if (spend12m > t.tierGold) return "VÀNG";
  if (spend12m > t.tierSilver) return "BẠC";
  return "MỚI";
}

/** Còn thiếu bao nhiêu để lên hạng kế tiếp; đã cao nhất thì `null`. */
export function conThieuLenHang(
  spend12m: number,
  t: TierThresholds,
): { hang: Tier; thieu: number } | null {
  if (spend12m > t.tierDiamond) return null;
  if (spend12m > t.tierGold) return { hang: "KIM CƯƠNG", thieu: t.tierDiamond - spend12m + 1 };
  if (spend12m > t.tierSilver) return { hang: "VÀNG", thieu: t.tierGold - spend12m + 1 };
  return { hang: "BẠC", thieu: t.tierSilver - spend12m + 1 };
}

/** Sắc thái badge, khớp mockup: kim cương và vàng nổi, còn lại trung tính. */
export function tierTone(t: Tier): "ok" | "warn" | "neutral" {
  if (t === "KIM CƯƠNG") return "warn";
  if (t === "VÀNG") return "ok";
  return "neutral";
}
