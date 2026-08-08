/**
 * Tên hãng vận chuyển hiện cho người đọc.
 *
 * Nằm ở `lib` vì bốn chỗ cùng dùng: tra cứu đơn, chi tiết đơn ở quản trị, bản
 * in hoá đơn, và thư báo trạng thái. Mỗi chỗ giữ một bản riêng thì cùng một đơn
 * lại được gọi tên khác nhau ở hai màn.
 */
export const CARRIER_LABEL: Record<string, string> = {
  GHN: "Giao Hàng Nhanh",
  GHTK: "Giao Hàng Tiết Kiệm",
  VIETTEL_POST: "Viettel Post",
  STORE_PICKUP: "Nhận tại cửa hàng",
};
