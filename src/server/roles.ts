import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { VaiTro } from "@/lib/roles";

/**
 * Danh sách vai trò, đọc từ DB.
 *
 * Bọc `cache()` của React: một lượt render có thể hỏi vai trò ở vài chỗ — thanh
 * bên, tiêu đề trang, bảng nhân sự — mà danh sách này chỉ vài dòng và đổi vài
 * tháng một lần.
 *
 * Để ở `src/server/` chứ không phải `src/server/admin/`: header của storefront
 * cũng cần nhãn vai trò để hiện "Bạn đang đăng nhập với vai trò …".
 */
export const danhSachVaiTro = cache(async (): Promise<VaiTro[]> => {
  return db.role.findMany({ orderBy: [{ sort: "asc" }, { key: "asc" }] });
});

/** Chỉ những vai trò vào được khu quản trị. */
export const vaiTroNhanVien = cache(async (): Promise<VaiTro[]> => {
  return (await danhSachVaiTro()).filter((r) => r.isStaff);
});

export const vaiTroTheoKhoa = cache(async (key: string): Promise<VaiTro | null> => {
  return (await danhSachVaiTro()).find((r) => r.key === key) ?? null;
});
