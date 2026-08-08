import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container } from "@/components/storefront/shell";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { readCart, readCartCoupon } from "@/server/cart";
import { listAddresses } from "@/server/addresses";
import { currentUserId } from "@/auth";
import { quoteShipping, type ShippingQuote } from "@/lib/shipping";
import { PROVINCES } from "@/lib/dia-gioi";
import { db } from "@/lib/db";

import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Thanh toán — Men Style House" };

export default async function CheckoutPage() {
  const [cart, applied, userId, caiDat] = await Promise.all([
    readCart(),
    readCartCoupon(),
    currentUserId(),
    getSettings(),
  ]);

  const subtotal = cart?.subtotal ?? 0;
  const discount = applied?.discount ?? 0;
  const addresses = userId ? await listAddresses(userId) : [];

  /*
   * Điền sẵn tên/SĐT/email của thành viên khi sổ địa chỉ còn trống. Bắt người
   * đã đăng nhập gõ lại từ đầu mọi lần mua là chỗ rơi khách rõ nhất ở bước cuối.
   */
  const toi = userId
    ? await db.user.findUnique({
        where: { id: userId },
        select: { name: true, phone: true, email: true },
      })
    : null;

  // Bảng phí phẳng nên tính sẵn cho mọi tỉnh; đổi tỉnh không phải gọi lại server.
  const quotesByProvince: Record<string, ShippingQuote[]> = {};
  for (const p of PROVINCES) {
    quotesByProvince[p] = quoteShipping(p, Math.max(0, subtotal - discount), caiDat);
  }

  return (
    <>
      <Header />
      <main>
        <Container narrow className="pb-16 pt-6">
          <h1 className="mb-[22px] text-[28px] lg:text-[40px]">Thanh toán</h1>

          {!cart || cart.lines.length === 0 ? (
            <div className="border border-dashed border-border-soft bg-subtle px-5 py-14 lg:px-8">
              <h2 className="mb-2.5 text-[22px]">Chưa có gì để thanh toán</h2>
              <p className="mb-5 max-w-[420px] text-[14px] text-muted">
                Giỏ hàng đang trống nên chưa đặt đơn được.
              </p>
              <Link
                href="/san-pham"
                className="inline-flex min-h-12 items-center bg-accent px-6 text-[14px] font-extrabold text-bg hover:bg-accent-600"
              >
                XEM SẢN PHẨM
              </Link>
            </div>
          ) : (
            <CheckoutForm
            nganHang={{
              bankName: caiDat.bankName,
              bankAccount: caiDat.bankAccount,
              bankOwner: caiDat.bankOwner,
              qrUrl: caiDat.qrUrl,
            }}
              subtotal={subtotal}
              discount={discount}
              couponCode={applied?.code ?? null}
              quotesByProvince={quotesByProvince}
              isMember={Boolean(userId)}
              addresses={addresses}
              toi={toi ? { name: toi.name, phone: toi.phone ?? "", email: toi.email ?? "" } : null}
            />
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
