import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container } from "@/components/storefront/shell";
import { AcceptInviteForm } from "@/components/storefront/accept-invite-form";
import { readInvite } from "@/server/admin/staff";
import { ROLE_LABEL } from "@/lib/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nhận lời mời — Men Style House",
  robots: { index: false, follow: false },
};

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const moi = await readInvite(token);

  return (
    <>
      <Header />
      <main>
        <Container narrow className="pb-16 pt-10">
          {!moi ? (
            <div className="max-w-[520px] border-2 border-divider bg-surface p-7">
              <h1 className="mb-3 text-[26px] leading-[1.2]">Lời mời không dùng được</h1>
              <p className="mb-6 text-[14.5px] leading-[1.7] text-muted">
                Đường dẫn đã hết hạn, đã được dùng, hoặc bị thu hồi. Nhờ người mời tạo lại giúp một
                lời mời mới.
              </p>
              <Link
                href={{ pathname: "/" }}
                className="flex min-h-12 w-fit items-center border-2 border-divider px-6 text-[14px] font-extrabold"
              >
                Về trang chủ
              </Link>
            </div>
          ) : (
            <div className="max-w-[520px]">
              <h1 className="mb-2 text-[32px] leading-[1.15]">Nhận lời mời</h1>
              <p className="mb-7 text-[14.5px] leading-[1.7] text-muted">
                Bạn được mời vào khu quản trị Men Style House với vai trò{" "}
                <strong className="text-text">
                  {ROLE_LABEL[moi.role as keyof typeof ROLE_LABEL]}
                </strong>
                . Đặt mật khẩu để bắt đầu — đăng nhập sau này bằng{" "}
                <strong className="font-mono text-text">{moi.email}</strong>.
              </p>

              <AcceptInviteForm token={token} />
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
