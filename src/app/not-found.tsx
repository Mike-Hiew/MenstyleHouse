import Link from "next/link";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex min-h-[55vh] items-center justify-center px-6 py-20">
        <div className="flex max-w-lg flex-col items-center gap-4 text-center">
          <span className="font-mono text-[56px] font-bold leading-none text-accent">404</span>
          <h1 className="text-[26px]">Không tìm thấy trang</h1>
          <p className="text-[14px] text-neutral-600">
            Đường dẫn không tồn tại hoặc sản phẩm đã ngừng bán. Bạn xem các danh
            mục đang có nhé.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/san-pham"
              className="inline-flex h-11 items-center bg-accent px-4 text-[14px] font-semibold text-white hover:bg-accent-600"
            >
              Xem tất cả sản phẩm
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center border-2 border-divider px-4 text-[14px] font-semibold hover:bg-neutral-200"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
