/**
 * Phần thuần của vai trò — không chạm DB nên client component và test đều dùng
 * được. Lớp kiểm thật nằm ở `src/server/admin/guard.ts`.
 *
 * Từ M6.22 vai trò là **dữ liệu** chứ không còn là enum, nên ở đây **không còn
 * danh sách nào viết cứng**. Trước đây `STAFF_ROLES` và `ROLE_LABEL` nằm ngay
 * file này: thêm một vai trò là phải sửa mã và triển khai lại, mà đó chính là
 * thứ cần bỏ.
 */

/** Vai trò rút gọn — đủ để hiển thị và phân quyền, đi qua được ranh giới client. */
export type VaiTro = {
  key: string;
  label: string;
  isStaff: boolean;
  isSuper: boolean;
  builtIn: boolean;
  sort: number;
};

/**
 * Nhãn để hiện. Không tìm thấy thì trả về **chính khoá** chứ không trả chuỗi
 * rỗng: một ô trống trên màn hình không nói được gì, còn `TRUONG_CA` thì ít
 * nhất người đọc còn đoán ra và biết đường đi tìm.
 */
export function nhanVaiTro(key: string, ds: Pick<VaiTro, "key" | "label">[]): string {
  return ds.find((r) => r.key === key)?.label ?? key;
}

export function laNhanVien(key: string, ds: Pick<VaiTro, "key" | "isStaff">[]): boolean {
  return ds.find((r) => r.key === key)?.isStaff ?? false;
}

/**
 * Khoá vai trò: CHỮ_HOA_GACH_DƯỚI.
 *
 * Khoá nằm trong JWT, trong `RolePermission` và trong `StaffInvite` — nó là mã
 * định danh chứ không phải chữ để đọc. Ràng dạng ngay từ lúc tạo để không có
 * khoá mang dấu tiếng Việt hay khoảng trắng lọt vào những chỗ đó.
 */
export const DANG_KHOA = /^[A-Z][A-Z0-9_]{1,29}$/;

export function laKhoaVaiTro(v: string): boolean {
  return DANG_KHOA.test(v);
}

/** Gợi ý khoá từ tên người ta vừa gõ: "Trưởng ca" → "TRUONG_CA". */
export function khoaTuTen(ten: string): string {
  return ten
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}
