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
 *
 * **Lệch mockup một chỗ, cố ý**: mockup để mỗi mục một chấm vuông cùng màu
 * (`dot`), thu gọn thì bỏ luôn nhãn. Làm đúng vậy thì thanh bên thu gọn là 13
 * chấm giống hệt nhau — bấm vẫn đúng, nhưng nhìn không biết mục nào là mục nào,
 * nên thu gọn chỉ tổ làm mất đường. Mỗi mục mang một icon riêng.
 */
/**
 * Khoá icon, **không** phải component icon.
 *
 * Mảng này đi từ layout (server) sang `AdminShell` (client) bằng prop, mà qua
 * ranh giới đó chỉ lọt được dữ liệu tuần tự hoá được — truyền thẳng component
 * của lucide vào đây là Next ném lỗi ngay lúc dựng. Phía client tra khoá này ra
 * component.
 */
export type IconKey =
  | "tong-quan"
  | "san-pham"
  | "danh-muc"
  | "bang-size"
  | "don-hang"
  | "ton-kho"
  | "nhap-kho"
  | "kho"
  | "hoa-don"
  | "khach-hang"
  | "khuyen-mai"
  | "ho-tro"
  | "bao-cao"
  | "nhan-su"
  | "cai-dat";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: IconKey;
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
  { label: "Tổng quan", href: "/admin", icon: "tong-quan" },
  { label: "Sản phẩm", href: "/admin/san-pham", icon: "san-pham", can: "san-pham.xem" },
  {
    label: "Danh mục & thương hiệu",
    href: "/admin/danh-muc",
    icon: "danh-muc",
    can: "danh-muc.quan-ly",
  },
  { label: "Bảng size", href: "/admin/bang-size", icon: "bang-size", can: "bang-size.quan-ly" },
  { label: "Đơn hàng", href: "/admin/don-hang", icon: "don-hang", can: "don.xem" },
  /**
   * Mockup gộp một mục "Kho"; ở đây tách hai vì là hai màn khác hẳn nhau và
   * khác cả quyền: xem tồn thì ai cũng xem được, còn ghi sổ phiếu nhập là thao
   * tác một chiều chỉ thủ kho và quản trị được làm.
   */
  { label: "Tồn kho", href: "/admin/ton-kho", icon: "ton-kho", can: "kho.xem" },
  { label: "Nhập kho", href: "/admin/nhap-kho", icon: "nhap-kho", can: "kho.ghi-so" },
  /**
   * Danh mục kho — nơi hàng nằm, không phải số lượng hàng. Cùng khả năng với
   * Nhập kho: mở và đóng kho là việc một chiều, kế toán xem tồn được nhưng
   * không đụng vào danh mục.
   */
  { label: "Danh mục kho", href: "/admin/kho", icon: "kho", can: "kho.ghi-so" },
  { label: "Hoá đơn", href: "/admin/hoa-don", icon: "hoa-don", can: "hoa-don.xem" },
  { label: "Khách hàng", href: "/admin/khach-hang", icon: "khach-hang", can: "khach-hang.xem" },
  { label: "Khuyến mãi", href: "/admin/khuyen-mai", icon: "khuyen-mai", can: "khuyen-mai.quan-ly" },
  { label: "Hỗ trợ", href: "/admin/ho-tro", icon: "ho-tro", can: "ho-tro.tra-loi" },
  { label: "Báo cáo", href: "/admin/bao-cao", icon: "bao-cao", can: "bao-cao.xem" },
  /**
   * Nhân sự đứng riêng chứ không nằm trong Cài đặt: đây là quản lý **người**,
   * không phải tham số cửa hàng. Dùng chung khoá quyền `cai-dat.quan-ly` với
   * Cài đặt — tách màn không phải dịp đổi phân quyền.
   */
  { label: "Nhân sự", href: "/admin/nhan-su", icon: "nhan-su", can: "cai-dat.quan-ly" },
  { label: "Cài đặt", href: "/admin/cai-dat", icon: "cai-dat", can: "cai-dat.quan-ly" },
];

export function visibleNav(can: (key: PermissionKey) => boolean): AdminNavItem[] {
  return ADMIN_NAV.filter((n) => !n.can || can(n.can));
}
