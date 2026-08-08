import type { Metadata } from "next";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container, Crumbs } from "@/components/storefront/shell";
import { ForgotForm } from "@/components/storefront/forgot-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quên mật khẩu — Men Style House",
  robots: { index: false, follow: false },
};

export default function ForgotPage() {
  return (
    <>
      <Header />
      <main>
        <Container narrow className="pb-16 pt-6">
          <Crumbs parts={["TRANG CHỦ", "QUÊN MẬT KHẨU"]} />
          <div className="max-w-[440px]">
            <h1 className="mb-2 text-[32px] leading-[1.15]">Quên mật khẩu</h1>
            <p className="mb-7 text-[14.5px] leading-[1.7] text-muted">
              Nhập số điện thoại hoặc email của tài khoản. Cửa hàng gửi một đường dẫn đặt lại tới
              email đã đăng ký, dùng được một lần trong vòng một giờ.
            </p>
            <ForgotForm />
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
