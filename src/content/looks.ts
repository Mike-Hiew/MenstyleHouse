/**
 * Bộ đồ cho khối "Mặc thử nguyên bộ" ở trang chủ (mục 5, giao diện v2).
 *
 * Mỗi món trỏ tới một sản phẩm theo slug, đúng màu và size mặc trong ảnh, và
 * vị trí điểm chấm trên ảnh tính theo % (x từ trái, y từ trên). Món nào không
 * còn bán, hoặc không có đúng biến thể màu/size, sẽ tự ẩn; còn dưới 2 món thì
 * cả khối không hiện.
 *
 * TODO(cửa hàng): thay `image` bằng ảnh lookbook thật (một người mặc cả bộ)
 * rồi chỉnh lại x/y cho khớp. Khi `image` là null, khối mượn tạm ảnh của món
 * đầu tiên — điểm chấm khi đó chỉ mang tính minh hoạ.
 */
export type LookItemConfig = {
  product: string;
  color: string;
  size: string;
  /** % theo chiều ngang ảnh. */
  x: number;
  /** % theo chiều dọc ảnh. */
  y: number;
};

export type LookConfig = {
  id: string;
  title: string;
  note: string;
  image: { url: string; alt: string } | null;
  items: LookItemConfig[];
};

export const LOOKS: LookConfig[] = [
  {
    id: "look-01",
    title: "Look 01 · Cuối tuần",
    note: "Chọn món bạn muốn, bỏ món đã có. Tổng tiền cập nhật ngay.",
    image: null, // TODO: ảnh lookbook thật
    items: [
      { product: "mu-luoi-trai-msh-116", color: "Be", size: "Freesize", x: 52, y: 12 },
      { product: "ao-phong-cotton-250gsm-msh-101", color: "Trắng", size: "L", x: 46, y: 36 },
      { product: "short-kaki-msh-107", color: "Navy", size: "31", x: 56, y: 68 },
    ],
  },
];
