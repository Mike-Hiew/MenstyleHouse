import type { PermissionKey } from "@/lib/permissions";

/**
 * Sidebar admin, bám `navItems` trong mockup:
 *
 *     [dash, products, cats, orders, inventory, invoices,
 *      customers, promos, support, reports, settings]
 *
 * Mục thuộc milestone chưa làm vẫn hiện nhưng mờ và không bấm được — giấu đi
 * thì sidebar nhảy chỗ qua từng milestone, khách dùng thử sẽ tưởng chức năng
 * biến mất.
 */
export type AdminNavItem = {
  label: string;
  href: string;
  /** Chưa dựng ở milestone hiện tại. */
  soon?: boolean;
  /**
   * Khả năng cần có để thấy mục này; bỏ trống là mọi nhân viên đều thấy.
   *
   * Nói theo **khả năng** chứ không theo vai trò: sidebar phải khớp đúng thứ
   * server cho phép, mà server giờ chốt theo khả năng. Liệt kê vai trò ở đây
   * thì đổi quyền trong Cài đặt xong sidebar vẫn hiện y như cũ.
   */
  can?: PermissionKey;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Tổng quan", href: "/admin" },
  { label: "Sản phẩm", href: "/admin/san-pham", can: "san-pham.xem" },
  { label: "Danh mục & thương hiệu", href: "/admin/danh-muc", can: "danh-muc.quan-ly" },
  { label: "Bảng size", href: "/admin/bang-size", can: "bang-size.quan-ly" },
  { label: "Đơn hàng", href: "/admin/don-hang", can: "don.xem" },
  /**
   * Mockup gộp một mục "Kho"; ở đây tách hai vì là hai màn khác hẳn nhau và
   * khác cả quyền: xem tồn thì ai cũng xem được, còn ghi sổ phiếu nhập là thao
   * tác một chiều chỉ thủ kho và quản trị được làm.
   */
  { label: "Tồn kho", href: "/admin/ton-kho", can: "kho.xem" },
  { label: "Nhập kho", href: "/admin/nhap-kho", can: "kho.ghi-so" },
  { label: "Hoá đơn", href: "/admin/hoa-don", can: "hoa-don.xem" },
  { label: "Khách hàng", href: "/admin/khach-hang", can: "khach-hang.xem" },
  { label: "Khuyến mãi", href: "/admin/khuyen-mai", can: "khuyen-mai.quan-ly" },
  { label: "Hỗ trợ", href: "/admin/ho-tro", can: "ho-tro.tra-loi" },
  { label: "Báo cáo", href: "/admin/bao-cao", can: "bao-cao.xem" },
  { label: "Cài đặt", href: "/admin/cai-dat", can: "cai-dat.quan-ly" },
];

export function visibleNav(can: (key: PermissionKey) => boolean): AdminNavItem[] {
  return ADMIN_NAV.filter((n) => !n.can || can(n.can));
}
