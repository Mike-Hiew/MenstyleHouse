import type { Role } from "@prisma/client";

/**
 * Danh mục khả năng và ma trận mặc định.
 *
 * Thuần, không chạm DB — client component vẽ bảng tick và test đều dùng được.
 * Lớp kiểm thật nằm ở `src/server/admin/guard.ts`.
 *
 * **Khả năng là một tập cố định khai trong mã**, không phải dữ liệu người dùng
 * tự thêm. Mỗi khả năng tương ứng một chốt chặn có thật ở server; cho tạo khả
 * năng mới từ giao diện chỉ sinh ra những dòng không chặn gì cả.
 */

export const PERMISSIONS = [
  { key: "don.xem", group: "Đơn hàng", label: "Xem đơn hàng" },
  { key: "don.doi-trang-thai", group: "Đơn hàng", label: "Đổi trạng thái đơn" },
  { key: "don.van-chuyen", group: "Đơn hàng", label: "Nhập mã vận đơn" },

  { key: "san-pham.xem", group: "Sản phẩm", label: "Xem sản phẩm" },
  { key: "san-pham.sua", group: "Sản phẩm", label: "Thêm và sửa sản phẩm" },
  { key: "danh-muc.quan-ly", group: "Sản phẩm", label: "Quản lý danh mục & thương hiệu" },
  { key: "bang-size.quan-ly", group: "Sản phẩm", label: "Quản lý bảng size" },

  { key: "kho.xem", group: "Kho", label: "Xem tồn kho" },
  { key: "kho.ghi-so", group: "Kho", label: "Ghi sổ phiếu nhập & điều chỉnh" },

  { key: "hoa-don.xem", group: "Kế toán", label: "Xem hoá đơn" },
  { key: "hoa-don.phat-hanh", group: "Kế toán", label: "Phát hành hoá đơn GTGT" },
  { key: "thanh-toan.xac-nhan", group: "Kế toán", label: "Xác nhận đã nhận chuyển khoản" },
  { key: "bao-cao.xem", group: "Kế toán", label: "Xem báo cáo doanh thu" },

  { key: "khach-hang.xem", group: "Khách hàng", label: "Xem hồ sơ khách" },
  { key: "khach-hang.tao", group: "Khách hàng", label: "Tạo tài khoản cho khách" },
  { key: "ho-tro.tra-loi", group: "Khách hàng", label: "Trả lời yêu cầu hỗ trợ" },

  { key: "khuyen-mai.quan-ly", group: "Quản trị", label: "Quản lý mã giảm giá" },
  { key: "cai-dat.quan-ly", group: "Quản trị", label: "Sửa cài đặt cửa hàng" },
  { key: "phan-quyen.quan-ly", group: "Quản trị", label: "Quản lý thành viên & phân quyền" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as PermissionKey[];

export function isPermissionKey(v: string): v is PermissionKey {
  return (PERMISSION_KEYS as string[]).includes(v);
}

/** Nhóm để vẽ bảng tick theo cụm, giữ nguyên thứ tự khai ở trên. */
export function permissionGroups() {
  const ra: { group: string; items: { key: PermissionKey; label: string }[] }[] = [];
  for (const p of PERMISSIONS) {
    const cuoi = ra.at(-1);
    if (cuoi?.group === p.group) cuoi.items.push({ key: p.key, label: p.label });
    else ra.push({ group: p.group, items: [{ key: p.key, label: p.label }] });
  }
  return ra;
}

/**
 * **Chủ cửa hàng luôn có mọi khả năng, không sửa được.**
 *
 * Cho bỏ tick của ADMIN là mở đường tự khoá cửa: gỡ đúng `phan-quyen.quan-ly`
 * thì không còn ai vào được màn phân quyền để sửa lại, phải đi sửa thẳng DB.
 */
export const SIEU_QUYEN: Role = "ADMIN";

export function canDo(role: Role, key: PermissionKey, matrix: Record<string, string[]>): boolean {
  if (role === SIEU_QUYEN) return true;
  return matrix[role]?.includes(key) ?? false;
}

/**
 * Ma trận mặc định — **chép đúng những gì đang viết cứng trong mã** trước khi
 * có bảng này. Nhờ vậy chạy migration xong hệ thống phân quyền y hệt hôm qua;
 * đổi quyền là việc của người bấm tick, không phải tác dụng phụ của nâng cấp.
 */
export const MA_TRAN_MAC_DINH: Record<Exclude<Role, "ADMIN" | "CUSTOMER">, PermissionKey[]> = {
  STAFF: [
    "don.xem",
    "don.doi-trang-thai",
    "don.van-chuyen",
    "san-pham.xem",
    "san-pham.sua",
    "kho.xem",
    "khach-hang.xem",
    "khach-hang.tao",
    "ho-tro.tra-loi",
  ],
  WAREHOUSE: ["kho.xem", "kho.ghi-so", "san-pham.xem", "don.xem"],
  ACCOUNTANT: [
    "hoa-don.xem",
    "hoa-don.phat-hanh",
    "thanh-toan.xac-nhan",
    "bao-cao.xem",
    "don.xem",
    "kho.xem",
  ],
};
