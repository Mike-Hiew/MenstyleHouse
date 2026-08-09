import type { Metadata } from "next";
import { headers } from "next/headers";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container, Crumbs } from "@/components/storefront/shell";
import { OrderSummary } from "@/components/storefront/order-summary";
import { findOrderForLookup } from "@/server/orders";
import { limitOrderLookup } from "@/server/rate-limit";
import type { RawSearchParams } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tra cứu đơn hàng — Men Style House" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const code = one(raw.ma).trim();
  const tail = one(raw.sdt).trim();

  // Chỉ tra khi có đủ mã *và* 4 số cuối — mã trần không đủ để xem đơn người khác.
  const submitted = code !== "" && tail !== "";

  // Chặn dò mã hàng loạt: 10 lượt/IP/giờ theo `docs/API.md`.
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
  const limited = submitted && !(await limitOrderLookup(ip)).ok;

  const order = submitted && !limited ? await findOrderForLookup(code, tail) : null;

  return (
    <>
      <Header />
      <main>
        <Container narrow className="pb-16 pt-6">
          <Crumbs parts={["TRANG CHỦ", "TRA CỨU ĐƠN"]} />

          <h1 className="mb-6 border-b-2 border-divider pb-3.5 text-[26px] lg:text-[36px]">
            Tra cứu đơn hàng
          </h1>

          <form method="get" className="mb-8 flex max-w-[560px] flex-col gap-3 sm:flex-row">
            <input
              name="ma"
              defaultValue={code}
              required
              aria-label="Mã đơn hàng"
              placeholder="MSH-2026-00148"
              className="h-12 w-full border-2 border-divider bg-surface px-3 font-mono text-[16px] lg:text-[14px]"
            />
            <input
              name="sdt"
              defaultValue={tail}
              required
              inputMode="numeric"
              maxLength={4}
              aria-label="4 số cuối điện thoại"
              placeholder="4 số cuối SĐT"
              className="h-12 w-full border-2 border-divider bg-surface px-3 text-[16px] sm:w-[160px] lg:text-[14px]"
            />
            <button
              type="submit"
              className="h-12 flex-none bg-accent px-6 text-[14px] font-extrabold text-bg hover:bg-accent-600"
            >
              TÌM
            </button>
          </form>

          {limited ? (
            <div
              role="alert"
              className="max-w-[560px] border-2 border-accent bg-accent-100 px-5 py-6 text-[14px] font-semibold text-accent-800"
            >
              Bạn đã tra cứu quá nhiều lần. Thử lại sau một giờ, hoặc gọi 1900 6060.
            </div>
          ) : null}

          {submitted && !limited && !order ? (
            <div
              role="alert"
              className="max-w-[560px] border border-dashed border-border-soft bg-subtle px-5 py-10"
            >
              <h2 className="mb-2 text-[18px]">Không tìm thấy đơn nào</h2>
              <p className="text-[14px] text-muted">
                Kiểm tra lại mã đơn và 4 số cuối điện thoại đặt hàng. Nếu vẫn không ra, gọi
                <span className="font-mono"> 1900 6060</span>.
              </p>
            </div>
          ) : null}

          {!submitted ? (
            <p className="max-w-[560px] text-[14px] text-muted">
              Nhập mã đơn trong tin nhắn xác nhận cùng 4 số cuối của số điện thoại đã đặt hàng.
              Không cần đăng nhập.
            </p>
          ) : null}

          {order ? <OrderSummary order={order} /> : null}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
