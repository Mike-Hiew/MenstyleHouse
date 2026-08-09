/**
 * Hình dạng một bảng size khi hiện ra ngoài trang sản phẩm.
 *
 * Trước M6.18 file này còn giữ **ba bảng viết cứng** và một ánh xạ theo slug
 * danh mục — thêm nhóm hàng mới là phải sửa mã và triển khai lại, còn cửa hàng
 * thì không tự đổi được một con số nào. Dữ liệu giờ nằm trong bảng `SizeChart`,
 * quản lý ở `/admin/bang-size`; ở đây chỉ còn lại kiểu, dùng chung giữa server
 * và component hiển thị.
 */
export type SizeChart = {
  title: string;
  /** Cột đầu luôn là "Size" — nó là khoá của mỗi dòng, không sửa được. */
  columns: string[];
  rows: { size: string; values: string[] }[];
  fit: string;
  howTo: string[];
};
