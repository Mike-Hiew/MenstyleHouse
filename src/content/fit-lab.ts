/**
 * Số liệu cho khối Fit Lab ở trang chủ (mục 5, giao diện v2).
 *
 * TODO(cửa hàng): **mọi con số dưới đây là số giữ chỗ**, chưa phải kết quả đo
 * thật. Khối này mặc định TẮT (`NEXT_PUBLIC_FF_FIT_LAB`) — chỉ bật sau khi đã
 * điền số đo thật và ảnh trước/sau giặt thật. Đưa số bịa lên trang là hứa
 * với khách một điều cửa hàng chưa kiểm chứng.
 */
export const FIT_LAB = {
  eyebrow: "Fit Lab",
  title: "Đứng form là đo được.",
  /** Dòng chú thích nhỏ dưới các bước — ghi rõ nguồn số liệu. */
  note: "TODO: ghi nguồn đo, ví dụ “Đo nội bộ trên 12 mẫu áo phông MSH-101, tháng 10/2026.”",

  fabric: {
    label: "Vải",
    value: "250gsm", // TODO
    detail: "Cotton dệt kim dày, đứng form mà vẫn thoáng.", // TODO
  },

  wash: {
    label: "Sau 30 lần giặt máy",
    value: "Co rút 0,8%", // TODO
    detail: "Đo lại dài áo và rộng ngực sau 30 lần giặt máy 40°C.", // TODO
    /** Ảnh trước/sau giặt. TODO: ảnh thật; `null` thì hiện khung màu giữ chỗ. */
    before: null as { url: string; alt: string } | null,
    after: null as { url: string; alt: string } | null,
    /** Số đo hiện trên hai nửa ảnh (cm). TODO */
    measures: [
      { label: "Dài áo", before: 72.0, after: 71.4 },
      { label: "Rộng ngực", before: 52.0, after: 51.7 },
    ],
  },

  stitch: {
    label: "Đường may",
    value: "May đôi", // TODO
    detail: "Hai đường chỉ ở vai và sườn — chỗ áo hay bai nhất.", // TODO
  },

  range: {
    label: "Dải cân nặng",
    value: "45–90kg", // TODO
    detail: "Năm size S–XXL, mỗi size phủ khoảng 9kg.", // TODO
    /** TODO: lấy theo bảng size thật. */
    sizes: [
      { size: "S", kg: "45–55" },
      { size: "M", kg: "54–63" },
      { size: "L", kg: "62–71" },
      { size: "XL", kg: "70–80" },
      { size: "XXL", kg: "79–90" },
    ],
  },
} as const;
