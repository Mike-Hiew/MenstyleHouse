import type { Role } from "@prisma/client";

/**
 * Phần thuần của phân quyền — không chạm Auth.js nên client component và test
 * đều import được. Lớp kiểm thật nằm ở `src/server/admin/guard.ts`.
 */

/** Ai được vào khu quản trị. Khách và CUSTOMER thì không. */
export const STAFF_ROLES: Role[] = ["STAFF", "WAREHOUSE", "ACCOUNTANT", "ADMIN"];

export function isStaff(role: Role | undefined | null): boolean {
  return role ? STAFF_ROLES.includes(role) : false;
}

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: "Khách hàng",
  STAFF: "Nhân viên bán hàng",
  WAREHOUSE: "Nhân viên kho",
  ACCOUNTANT: "Kế toán",
  ADMIN: "Chủ cửa hàng",
};
