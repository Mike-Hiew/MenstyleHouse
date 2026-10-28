import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { visibleNav } from "@/components/admin/admin-nav";
import { myPermissions, requireStaff } from "@/server/admin/guard";
import { vieccanLam } from "@/server/admin/alerts";

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

  // Nút chuông chỉ hiện việc người này có quyền xử lý — đúng như sidebar.
  const viec = (await vieccanLam()).filter((v) => can(v.can));

  return (
    <AdminShell
      nav={visibleNav(can)}
      user={{ name: user.name, roleLabel: user.roleLabel, email: user.email ?? null }}
      viec={viec.map(({ key, nhan, so, href }) => ({ key, nhan, so, href }))}
      crumb="MSH ADMIN"
    >
      {children}
    </AdminShell>
  );
}
