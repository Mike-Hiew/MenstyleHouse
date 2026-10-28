import QRCode from "qrcode";
import { formatVnd } from "@/lib/money";
import type { OrderDetail } from "@/server/orders";

/**
 * Hoá đơn in nhiệt ở trang đặt hàng thành công (mục 7): chữ mono, mép răng
 * cưa, mã QR dẫn về trang tra cứu đơn.
 *
 * Không in tên, số điện thoại hay địa chỉ người nhận: khách hay chụp màn hình
 * trang này gửi đi, và QR chỉ mang mã đơn — muốn xem chi tiết vẫn phải nhập 4
 * số cuối điện thoại ở trang tra cứu.
 */

type Shop = { shopName: string; address: string; hotline: string };

const PAY_LABEL: Record<string, string> = {
  COD: "Khi nhận hàng",
  BANK_TRANSFER: "Chuyển khoản",
};

const ngayGio = (d: Date) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

export async function OrderReceipt({
  order,
  shop,
  origin,
}: {
  order: OrderDetail;
  shop: Shop;
  /** `https://tên-miền` của trang đang xem, để QR mở được từ điện thoại khác. */
  origin: string;
}) {
  const lookupUrl = origin + "/tra-cuu-don?ma=" + encodeURIComponent(order.code);
  const qr = await QRCode.toString(lookupUrl, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1d1c1a", light: "#0000" },
  });

  // Đơn không lưu riêng tiền giảm bằng điểm — suy ra từ phần chênh còn lại.
  const giamDiem = Math.max(0, order.subtotal - order.discount) + order.shippingFee - order.total;
  const soMon = order.items.reduce((n, i) => n + i.qty, 0);

  return (
    <div className="mx-auto w-full max-w-[380px] [filter:drop-shadow(0_18px_30px_rgba(21,20,19,.14))_drop-shadow(0_2px_4px_rgba(21,20,19,.08))]">
      <article
        aria-label={"Phiếu đặt hàng " + order.code}
        className="receipt-paper px-6 font-mono text-[12.5px] leading-[1.55] tabular-nums motion-safe:animate-[receipt-print_1.6s_cubic-bezier(.3,.7,.2,1)_both]"
      >
        <header className="text-center">
          <p className="text-[15px] font-bold uppercase tracking-[0.04em]">{shop.shopName}</p>
          <p className="mt-1 text-[11.5px] opacity-70">{shop.address}</p>
          <p className="text-[11.5px] opacity-70">Hotline {shop.hotline}</p>
        </header>

        <Rule />
        <p className="text-center text-[11.5px] font-bold tracking-[0.18em]">PHIẾU ĐẶT HÀNG</p>
        <dl className="mt-2">
          <Row k="Mã đơn" v={<b>{order.code}</b>} />
          <Row k="Thời gian" v={ngayGio(order.createdAt)} />
        </dl>
        <Rule />

        <ul aria-label={soMon + " món"}>
          {order.items.map((i) => (
            <li key={i.id} className="py-1">
              <p className="font-semibold">{i.productName}</p>
              <div className="flex justify-between gap-3 opacity-80">
                <span className="min-w-0">
                  {i.color} · {i.size} ·{" "}
                  <span className="whitespace-nowrap">
                    {i.qty} × {formatVnd(i.unitPrice)}
                  </span>
                </span>
                <span className="flex-none">{formatVnd(i.lineTotal)}</span>
              </div>
            </li>
          ))}
        </ul>
        <Rule />

        <dl>
          <Row k={"Tạm tính (" + soMon + " món)"} v={formatVnd(order.subtotal)} />
          {order.discount > 0 ? (
            <Row
              k={"Giảm giá" + (order.couponCode ? " · " + order.couponCode : "")}
              v={"−" + formatVnd(order.discount)}
            />
          ) : null}
          {giamDiem > 0 ? (
            <Row k={"Dùng " + order.pointsUsed + " điểm"} v={"−" + formatVnd(giamDiem)} />
          ) : null}
          <Row k="Phí giao" v={order.shippingFee > 0 ? formatVnd(order.shippingFee) : "Miễn phí"} />
        </dl>
        <div className="mt-2 flex items-baseline justify-between border-y border-dashed border-current/40 py-2">
          <span className="font-bold tracking-[0.12em]">TỔNG</span>
          <b className="text-[20px]">{formatVnd(order.total)}</b>
        </div>
        <dl className="mt-2">
          <Row k="Thanh toán" v={PAY_LABEL[order.paymentMethod] ?? order.paymentMethod} />
          {order.pointsEarned > 0 ? <Row k="Điểm tích luỹ" v={"+" + order.pointsEarned} /> : null}
        </dl>
        <Rule />

        <div className="flex items-center gap-4 pt-1">
          <div
            role="img"
            aria-label="Mã QR mở trang tra cứu đơn"
            className="h-[92px] w-[92px] flex-none [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <p className="text-[11.5px] leading-[1.5] opacity-80">
            Quét mã để tra cứu đơn. Nhập 4 số cuối điện thoại đặt hàng để xem chi tiết.
          </p>
        </div>

        <p className="mt-5 text-center text-[11.5px] font-bold tracking-[0.2em]">*** CẢM ƠN BẠN ***</p>
      </article>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="opacity-70">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

function Rule() {
  return <hr aria-hidden className="my-3 border-0 border-t border-dashed border-current/40" />;
}
