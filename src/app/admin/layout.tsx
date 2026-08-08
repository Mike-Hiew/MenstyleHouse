import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { visibleNav } from "@/components/admin/admin-nav";
import { myPermissions, requireStaff, ROLE_LABEL } from "@/server/admin/guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Quản trị — Men Style House" };

/**
 * Guard chạy ở đây cho mọi trang con. `middleware.ts` chỉ chặn sớm; lớp kiểm
 * thật nằm ở server, đúng `docs/CLAUDE-rules.md`.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  // Sidebar hiện đúng những mục người này thật sự vào được — nói theo khả năng,
  // cùng ngôn ngữ với chốt chặn ở từng trang.
  const { can } = await myPermissions();

  return (
    <AdminShell
      nav={visibleNav(can)}
      user={{ name: user.name, roleLabel: ROLE_LABEL[user.role] }}
      crumb="MSH ADMIN"
    >
      {children}
    </AdminShell>
  );
}
