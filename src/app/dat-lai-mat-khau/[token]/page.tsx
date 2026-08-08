import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container } from "@/components/storefront/shell";
import { ResetForm } from "@/components/storefront/reset-form";
import { docYeuCau } from "@/server/password-reset";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu — Men Style House",
  robots: { index: false, follow: false },
};

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const yc = await docYeuCau(token);

  return (
    <>
      <Header />
      <main>
        <Container narrow className="pb-16 pt-10">
          {!yc ? (
            <div className="max-w-[520px] border-2 border-divider bg-surface p-7">
              <h1 className="mb-3 text-[26px] leading-[1.2]">Đường dẫn không dùng được</h1>
              <p className="mb-6 text-[14.5px] leading-[1.7] text-muted">
                Đường dẫn đã hết hạn, đã dùng rồi, hoặc bị thay bằng một yêu cầu mới hơn. Xin một
                đường dẫn khác giúp nhé.
              </p>
              <Link
                href={{ pathname: "/quen-mat-khau" }}
                className="flex min-h-12 w-fit items-center bg-accent px-6 text-[14px] font-extrabold text-bg"
              >
                XIN ĐƯỜNG DẪN MỚI
              </Link>
            </div>
          ) : (
            <div className="max-w-[440px]">
              <h1 className="mb-2 text-[32px] leading-[1.15]">Đặt mật khẩu mới</h1>
              <p className="mb-7 text-[14.5px] leading-[1.7] text-muted">
                Cho tài khoản <strong className="font-mono text-text">{yc.email}</strong>. Đặt xong
                thì đăng nhập lại bằng mật khẩu mới.
              </p>
              <ResetForm token={token} />
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
