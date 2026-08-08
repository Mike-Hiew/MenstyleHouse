import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container } from "@/components/storefront/shell";
import { CartLines } from "@/components/storefront/cart-lines";
import { CouponBox } from "@/components/storefront/coupon-box";
import { readCart, readCartCoupon } from "@/server/cart";
import { getSettings } from "@/server/settings";

import { formatVnd, pointsFor } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Giỏ hàng — Men Style House" };

export default async function CartPage() {
  const cart = await readCart();
  const lines = cart?.lines ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const applied = await readCartCoupon();
  const caiDat = await getSettings();
  const discount = applied?.discount ?? 0;
  const payable = Math.max(0, subtotal - discount);
  const missing = Math.max(0, caiDat.freeShipFrom - payable);
  const earn = pointsFor(payable);

  return (
    <>
      <Header />
      <main>
        <Container narrow className="pb-16 pt-6">
          <h1 className="mb-6 border-b-2 border-divider pb-4 text-[28px] lg:text-[40px]">
            Giỏ hàng
          </h1>

          {lines.length === 0 ? (
            <div className="border border-dashed border-border-soft bg-subtle px-5 py-14 lg:px-8 lg:py-16">
              <h2 className="mb-2.5 text-[22px]">Giỏ hàng đang trống</h2>
              <p className="mb-5 max-w-[420px] text-[14px] text-muted">
                Chọn vài món bạn thích rồi quay lại đây nhé.
              </p>
              <Link
                href="/san-pham"
                className="inline-flex min-h-12 items-center bg-accent px-6 text-[14px] font-extrabold text-bg hover:bg-accent-600"
              >
                XEM SẢN PHẨM
              </Link>
            </div>
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
              <CartLines lines={lines} />

              <aside className="border-t-2 border-divider pt-[18px] lg:sticky lg:top-[120px]">
                <h2 className="mb-4 text-[16px] font-extrabold">Tóm tắt đơn</h2>

                <p className="mb-3.5 bg-subtle px-3.5 py-3 text-[12.5px] leading-[1.6]">
                  Đơn này tích được <strong className="font-mono">{earn} điểm</strong> nếu bạn có
                  tài khoản. Điểm ghi nhận khi đơn đã thanh toán và đã giao.
                </p>

                {/* Khách vãng lai vẫn mua được — đây chỉ là lời mời, không chặn. */}
                <Link
                  href={{ pathname: "/dang-ky" }}
                  className="mb-3.5 flex min-h-11 items-center border border-accent px-3.5 text-[12.5px] font-extrabold text-accent-700"
                >
                  ĐĂNG KÝ ĐỂ TÍCH {earn} ĐIỂM
                </Link>
                <CouponBox />


                <dl className="flex flex-col gap-2.5 border-t border-hairline py-3.5 text-[14px]">
                  <Row label="Tạm tính" value={formatVnd(subtotal)} />
                  <Row
                    label={applied ? "Giảm giá · " + applied.code : "Giảm giá"}
                    value={"−" + formatVnd(discount)}
                  />
                  <Row
                    label="Phí vận chuyển"
                    value={missing === 0 ? "Miễn phí" : "Tính ở bước sau"}
                  />
                </dl>

                {missing > 0 ? (
                  <p className="mb-2 text-[12.5px] text-muted">
                    Mua thêm <strong className="font-mono">{formatVnd(missing)}</strong> để được
                    miễn phí giao hàng.
                  </p>
                ) : null}

                <div className="flex items-baseline justify-between border-t-2 border-divider py-4">
                  <span className="text-[14px] font-extrabold">TỔNG CỘNG</span>
                  <span className="text-[24px] font-extrabold tracking-[-0.02em]">
                    {formatVnd(payable)}
                  </span>
                </div>

                <Link
                  href="/thanh-toan"
                  className="flex h-[52px] w-full items-center bg-accent pl-5 text-[15px] font-extrabold text-bg hover:bg-accent-600"
                >
                  TIẾN HÀNH THANH TOÁN
                </Link>
                <Link
                  href="/san-pham"
                  className="flex h-11 w-full items-center pl-5 text-[13px] font-semibold text-muted"
                >
                  ← Tiếp tục mua sắm
                </Link>
              </aside>
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
