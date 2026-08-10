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

/**
 * Nhóm nghiệp vụ, gom theo câu hỏi **"đang làm việc gì"**.
 *
 * Mười lăm mục phẳng thì mắt phải đọc hết mới tìm ra chỗ cần. Chia theo luồng
 * công việc chứ không theo cấu trúc dữ liệu: người bán hàng ở lì trong `BÁN
 * HÀNG` cả ngày, thủ kho ở `HÀNG HOÁ`, kế toán ở `SỔ SÁCH`.
 *
 * **Không dùng nguyên sáu nhóm của `PERMISSIONS`** dù nó sẵn có: hai nhóm ở đó
 * chỉ ứng với đúng một mục menu, mà một tiêu đề đứng trên một dòng thì chỉ tốn
 * chỗ chứ không giúp tìm nhanh hơn.
 */
export type NhomNav = "ban-hang" | "hang-hoa" | "so-sach" | "he-thong";

export const NHOM_NAV: { key: NhomNav; label: string }[] = [
  { key: "ban-hang", label: "Bán hàng" },
  { key: "hang-hoa", label: "Hàng hoá" },
  { key: "so-sach", label: "Sổ sách" },
  { key: "he-thong", label: "Hệ thống" },
];

export type AdminNavItem = {
  label: string;
  href: string;
  icon: IconKey;
  /** Bỏ trống là mục đứng riêng trên đầu, ngoài mọi nhóm — chỉ Tổng quan. */
  nhom?: NhomNav;
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
  // Đứng riêng trên đầu: bảng tổng quan không thuộc nghiệp vụ nào, nó nói về
  // tất cả.
  { label: "Tổng quan", href: "/admin", icon: "tong-quan" },

  /* ── Bán hàng: mọi thứ dính tới khách và tiền vào ────────── */
  { label: "Đơn hàng", href: "/admin/don-hang", icon: "don-hang", nhom: "ban-hang", can: "don.xem" },
  {
    label: "Khách hàng",
    href: "/admin/khach-hang",
    icon: "khach-hang",
    nhom: "ban-hang",
    can: "khach-hang.xem",
  },
  { label: "Hỗ trợ", href: "/admin/ho-tro", icon: "ho-tro", nhom: "ban-hang", can: "ho-tro.tra-loi" },
  {
    label: "Khuyến mãi",
    href: "/admin/khuyen-mai",
    icon: "khuyen-mai",
    nhom: "ban-hang",
    can: "khuyen-mai.quan-ly",
  },

  /* ── Hàng hoá: thứ đem bán và chỗ nó nằm ─────────────────── */
  {
    label: "Sản phẩm",
    href: "/admin/san-pham",
    icon: "san-pham",
    nhom: "hang-hoa",
    can: "san-pham.xem",
  },
  {
    label: "Danh mục & thương hiệu",
    href: "/admin/danh-muc",
    icon: "danh-muc",
    nhom: "hang-hoa",
    can: "danh-muc.quan-ly",
  },
  {
    label: "Bảng size",
    href: "/admin/bang-size",
    icon: "bang-size",
    nhom: "hang-hoa",
    can: "bang-size.quan-ly",
  },
  /**
   * Mockup gộp một mục "Kho"; ở đây tách ba vì là ba màn khác hẳn nhau và khác
   * cả quyền: xem tồn thì ai cũng xem được, còn ghi sổ phiếu nhập và mở/đóng
   * kho là thao tác một chiều chỉ thủ kho và quản trị được làm.
   */
  { label: "Tồn kho", href: "/admin/ton-kho", icon: "ton-kho", nhom: "hang-hoa", can: "kho.xem" },
  {
    label: "Nhập kho",
    href: "/admin/nhap-kho",
    icon: "nhap-kho",
    nhom: "hang-hoa",
    can: "kho.ghi-so",
  },
  { label: "Danh mục kho", href: "/admin/kho", icon: "kho", nhom: "hang-hoa", can: "kho.ghi-so" },

  /* ── Sổ sách: thứ nộp cho thuế và thứ đọc để ra quyết định ─ */
  { label: "Hoá đơn", href: "/admin/hoa-don", icon: "hoa-don", nhom: "so-sach", can: "hoa-don.xem" },
  { label: "Báo cáo", href: "/admin/bao-cao", icon: "bao-cao", nhom: "so-sach", can: "bao-cao.xem" },

  /* ── Hệ thống: người và tham số cửa hàng ─────────────────── */
  /**
   * Nhân sự đứng riêng chứ không nằm trong Cài đặt: đây là quản lý **người**,
   * không phải tham số cửa hàng. Dùng chung khoá quyền `cai-dat.quan-ly` với
   * Cài đặt — tách màn không phải dịp đổi phân quyền.
   */
  {
    label: "Nhân sự",
    href: "/admin/nhan-su",
    icon: "nhan-su",
    nhom: "he-thong",
    can: "cai-dat.quan-ly",
  },
  {
    label: "Cài đặt",
    href: "/admin/cai-dat",
    icon: "cai-dat",
    nhom: "he-thong",
    can: "cai-dat.quan-ly",
  },
];

export function visibleNav(can: (key: PermissionKey) => boolean): AdminNavItem[] {
  return ADMIN_NAV.filter((n) => !n.can || can(n.can));
}

/**
 * Gom một danh sách mục **đã lọc theo quyền** thành các nhóm.
 *
 * **Nhóm rỗng bị bỏ hẳn.** Kế toán không có khả năng nào thuộc Hàng hoá; vẫn
 * hiện tiêu đề "HÀNG HOÁ" trống trơn thì trông như menu hỏng.
 *
 * Hàm thuần, nhận thẳng danh sách chứ không nhận hàm `can`: nhờ vậy component
 * gọi được mà không phải biết gì về phân quyền, và bộ kiểm thử dựng được đúng
 * mọi trường hợp chỉ bằng cách đưa vào một mảng.
 */
export function gomNhom(items: AdminNavItem[]): {
  dau: AdminNavItem[];
  nhom: { key: NhomNav; label: string; items: AdminNavItem[] }[];
} {
  return {
    dau: items.filter((n) => !n.nhom),
    nhom: NHOM_NAV.map((g) => ({ ...g, items: items.filter((n) => n.nhom === g.key) })).filter(
      (g) => g.items.length > 0,
    ),
  };
}
