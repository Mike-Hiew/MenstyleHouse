import type { Metadata } from "next";
import { StaffRoles } from "@/components/admin/staff-roles";
import { requirePermission } from "@/server/admin/guard";
import { listInvites, listStaff } from "@/server/admin/staff";
import { getMatrix } from "@/server/admin/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nhân sự & phân quyền" };

/**
 * Nhân sự và phân quyền.
 *
 * Tách khỏi màn Cài đặt ở M6.20: đây không phải cài đặt cửa hàng mà là quản lý
 * **người** — mời, đổi vai trò, tắt tài khoản, sửa ma trận khả năng. Gộp chung
 * còn khiến mỗi lần vào Cài đặt để sửa một con số cũng phải tải danh sách nhân
 * viên, lời mời và cả ma trận quyền.
 *
 * Vẫn dùng khoá quyền `cai-dat.quan-ly` như trước, nên ai đang vào được thì vẫn
 * vào được — tách màn không phải dịp đổi phân quyền.
 */
export default async function NhanSuPage() {
  const me = await requirePermission("cai-dat.quan-ly");
  const [staff, invites, matrix] = await Promise.all([listStaff(), listInvites(), getMatrix()]);

  return (
    <div>
      <div className="mb-6 border-b-2 border-border-soft pb-3.5">
        <h1 className="text-[26px] lg:text-[34px]">Nhân sự & phân quyền</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Mời người vào, đổi vai trò, tắt tài khoản và khai vai trò nào làm được việc gì.
        </p>
      </div>

      <StaffRoles
        members={staff.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          role: m.role,
          active: m.active,
          soHoaDon: m._count.invoicesIssued,
        }))}
        invites={invites}
        matrix={matrix}
        meId={me.id}
      />
    </div>
  );
}
