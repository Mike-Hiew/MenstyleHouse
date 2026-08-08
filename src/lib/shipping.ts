/**
 * Bảng phí phẳng — M2 dùng tạm cho tới khi nối GHN thật ở M7.
 * `docs/BUILD-PLAN.md`: "phí vận chuyển tạm tính bằng bảng phí phẳng".
 * Không bao giờ chặn checkout vì phí — luôn có giá trị trả về.
 */

export type ShippingRates = {
  shipInnerCity: number;
  shipProvince: number;
  freeShipFrom: number;
};

export type ShippingQuote = {
  carrier: "GHN" | "GHTK" | "VIETTEL_POST";
  name: string;
  fee: number;
  etaText: string;
};

/** Nội thành hai đô thị lớn rẻ và nhanh hơn phần còn lại. */
const INNER_CITY = ["TP. Hồ Chí Minh", "Hà Nội"];

export function quoteShipping(
  province: string,
  subtotal: number,
  rates: ShippingRates,
): ShippingQuote[] {
  const inner = INNER_CITY.includes(province);
  const base = inner ? rates.shipInnerCity : rates.shipProvince;
  const free = subtotal >= rates.freeShipFrom;

  return [
    {
      carrier: "GHN",
      name: "Giao Hàng Nhanh",
      fee: free ? 0 : base,
      etaText: inner ? "1–2 ngày" : "2–4 ngày",
    },
    {
      carrier: "GHTK",
      name: "Giao Hàng Tiết Kiệm",
      fee: free ? 0 : base - 5_000,
      etaText: inner ? "2–3 ngày" : "3–5 ngày",
    },
    {
      carrier: "VIETTEL_POST",
      name: "Viettel Post",
      fee: free ? 0 : base + 6_000,
      etaText: inner ? "1–2 ngày" : "2–3 ngày",
    },
  ];
}

export function findQuote(
  province: string,
  subtotal: number,
  carrier: string,
  rates: ShippingRates,
) {
  return quoteShipping(province, subtotal, rates).find((q) => q.carrier === carrier) ?? null;
}
