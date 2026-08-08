/**
 * Danh sách tỉnh/thành cho mọi ô chọn địa chỉ.
 *
 * Nằm ở `lib` vì **hai chỗ cùng dùng**: form thanh toán và sổ địa chỉ. Mỗi chỗ
 * giữ một bản riêng thì địa chỉ lưu trong sổ có thể mang tên tỉnh mà ô ở bước
 * thanh toán không có, và khách chọn lại từ đầu mà không hiểu vì sao.
 */
export const PROVINCES = [
  "TP. Hồ Chí Minh",
  "Hà Nội",
  "Đà Nẵng",
  "Cần Thơ",
  "Bình Dương",
  "Đồng Nai",
  "Hải Phòng",
  "Khánh Hoà",
] as const;
