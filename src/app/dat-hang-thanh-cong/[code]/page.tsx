import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { getOrderByCode } from "@/server/orders";
import { formatVnd } from "@/lib/money";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

export const metadata: Metadata = { title: "Đặt hàng thành công — Men Style House" };

const CARRIER_LABEL: Record<string, string> = {
  GHN: "Giao Hàng Nhanh",
  GHTK: "Giao Hàng Tiết Kiệm",
  VIETTEL_POST: "Viettel Post",
  STORE_PICKUP: "Nhận tại cửa hàng",
};

/** Cột mốc dự kiến, tính từ lúc đặt. Bước đầu đã xong nên chấm màu nhấn. */
function timelineFor(createdAt: Date, carrier: string | null) {
  const day = (n: number) =>
    new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(createdAt.getTime() + n * 86_400_000));

  return [
    { title: "Đã nhận đơn", when: "Hôm nay", done: true },
    { title: "Shop gọi xác nhận", when: "Trong 30 phút (giờ hành chính)", done: false },
    { title: "Đóng gói và bàn giao " + (carrier ? CARRIER_LABEL[carrier] ?? carrier : "vận chuyển"), when: day(1), done: false },
    { title: "Giao đến bạn", when: day(2) + " – " + day(4), done: false },
  ];
}

export default async function OrderPlacedPage({ params }: Params) {
  const { code } = await params;
  const order = await getOrderByCode(decodeURIComponent(code));
  if (!order) notFound();

  const facts = [
    { k: "MÃ ĐƠN", v: order.code },
    { k: "TỔNG TIỀN", v: formatVnd(order.total) },
    { k: "THANH TOÁN", v: order.paymentMethod === "COD" ? "Khi nhận hàng" : order.paymentMethod },
  ];

  const timeline = timelineFor(order.createdAt, order.carrier);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[820px] px-4 pb-20 pt-10 lg:px-8 lg:pt-12">
        <div className="mb-5 grid h-14 w-14 place-items-center bg-accent text-[30px] font-extrabold text-bg">
          ✓
        </div>

        <h1 className="mb-3 text-[30px] leading-[1.1] lg:text-[44px]">Đặt hàng thành công</h1>
        <p className="mb-7 text-[16px] text-muted">
          Cảm ơn bạn. Shop sẽ gọi xác nhận trong 30 phút (giờ hành chính).
        </p>

        <dl className="mb-8 grid grid-cols-1 border-b-2 border-t-2 border-divider sm:grid-cols-3">
          {facts.map((f, i) => (
            <div
              key={f.k}
              className={
                "py-[18px] pr-5 " +
                (i < facts.length - 1 ? "border-b border-hairline sm:border-b-0 sm:border-r" : "")
              }
            >
              <dt className="label-tech font-bold">{f.k}</dt>
              <dd className="mt-2 text-[19px] font-extrabold">{f.v}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mb-[18px] text-[22px]">Dự kiến hành trình</h2>
        <ol className="mb-8">
          {timeline.map((t, i) => (
            <li key={t.title} className="flex gap-4 pb-5">
              <div className="flex w-3.5 flex-none flex-col items-center">
                <span
                  className={"block h-3 w-3 " + (t.done ? "bg-accent" : "bg-hairline")}
                  aria-hidden
                />
                {i < timeline.length - 1 ? (
                  <span className="mt-1 block w-0.5 flex-1 bg-hairline" aria-hidden />
                ) : null}
              </div>
              <div className="pb-1">
                <p className={"text-[14.5px] font-extrabold " + (t.done ? "" : "text-muted")}>
                  {t.title}
                </p>
                <p className="font-mono text-[12.5px] text-faint">{t.when}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-3">
          <Link
            href={{
              pathname: "/tra-cuu-don",
              query: "ma=" + order.code + "&sdt=" + order.phone.slice(-4),
            }}
            className="flex min-h-12 items-center bg-neutral-900 px-6 text-[14px] font-extrabold text-bg"
          >
            TRA CỨU ĐƠN NÀY
          </Link>
          <Link
            href="/"
            className="flex min-h-12 items-center border border-border-soft px-6 text-[14px] font-extrabold"
          >
            Về trang chủ
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
