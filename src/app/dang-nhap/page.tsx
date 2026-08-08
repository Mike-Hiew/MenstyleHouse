import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container, Crumbs } from "@/components/storefront/shell";
import { AuthForm } from "@/components/storefront/auth-form";
import { currentUserId } from "@/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Đăng nhập — Men Style House" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ "dat-lai"?: string }>;
}) {
  if (await currentUserId()) redirect("/tai-khoan");

  // Vừa đặt lại mật khẩu xong thì bị đá về đây; không nói gì thì người ta không
  // biết đã đổi được hay chưa, và thử lại bằng mật khẩu cũ.
  const vuaDatLai = (await searchParams)["dat-lai"] === "1";

  return (
    <>
      <Header />
      <main>
        <Container narrow className="pb-16 pt-6">
          <Crumbs parts={["TRANG CHỦ", "Đăng nhập".toUpperCase()]} />
          <h1 className="mb-3 text-[28px] lg:text-[40px]">Đăng nhập</h1>
          <p className="mb-7 max-w-[420px] text-[14px] text-muted">Đăng nhập để xem điểm thưởng và đơn hàng của bạn.</p>
          {vuaDatLai ? (
            <p className="mb-5 max-w-[420px] border-2 border-divider bg-surface px-4 py-3 text-[14px] font-semibold">
              Đã đổi mật khẩu. Bạn đăng nhập lại bằng mật khẩu mới nhé.
            </p>
          ) : null}
          <AuthForm mode="dang-nhap" />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
