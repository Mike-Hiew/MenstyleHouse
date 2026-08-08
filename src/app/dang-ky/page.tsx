import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container, Crumbs } from "@/components/storefront/shell";
import { AuthForm } from "@/components/storefront/auth-form";
import { currentUserId } from "@/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Đăng ký — Men Style House" };

export default async function Page() {
  if (await currentUserId()) redirect("/tai-khoan");

  return (
    <>
      <Header />
      <main>
        <Container narrow className="pb-16 pt-6">
          <Crumbs parts={["TRANG CHỦ", "Đăng ký".toUpperCase()]} />
          <h1 className="mb-3 text-[28px] lg:text-[40px]">Đăng ký</h1>
          <p className="mb-7 max-w-[420px] text-[14px] text-muted">Tạo tài khoản để tích điểm, lưu sổ địa chỉ và xem lại đơn cũ.</p>
          <AuthForm mode="dang-ky" />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
