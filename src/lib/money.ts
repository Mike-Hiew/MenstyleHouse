/**
 * Tiền là Int đồng ở mọi nơi. Không bao giờ dùng Float.
 */
const vnd = new Intl.NumberFormat("vi-VN");

/** Mockup viết "459.000 ₫" — dấu cách rồi ký hiệu ₫, không phải chữ "đ". */
export function formatVnd(amount: number): string {
  return vnd.format(Math.round(amount)) + " ₫";
}

export function formatVndPlain(amount: number): string {
  return vnd.format(Math.round(amount));
}

/** Điểm thưởng: 1 điểm / 1.000đ trên tổng thanh toán. */
export function pointsFor(total: number): number {
  return Math.floor(total / 1000);
}

/** Tách VAT từ giá đã gồm thuế. */
export function splitVat(gross: number, vatRate: number) {
  const net = Math.round((gross * 100) / (100 + vatRate));
  return { net, vat: gross - net, gross };
}

/** Cộng VAT vào giá chưa thuế. */
export function addVat(net: number, vatRate: number) {
  const vat = Math.round((net * vatRate) / 100);
  return { net, vat, gross: net + vat };
}
