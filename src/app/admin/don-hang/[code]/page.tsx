import Link from "next/link";
import { requirePermission } from "@/server/admin/guard";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { OrderStatusPanel } from "@/components/admin/order-status-panel";
import { InvoicePanel } from "@/components/admin/invoice-panel";
import { PaymentPanel } from "@/components/admin/payment-panel";
import { ShippingPanel } from "@/components/admin/shipping-panel";
import {
  getOrderForAdmin,
  NEXT_STATUS,
  PAYMENT_LABEL,
  STATUS_LABEL,
} from "@/server/admin/orders";
import { formatDateTime } from "@/lib/format";
import { formatVnd } from "@/lib/money";
import { Photo } from "@/components/ui/photo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

export default async function AdminOrderDetailPage({ params }: Params) {
  await requirePermission("don.xem");
  const { code } = await params;
  const order = await getOrderForAdmin(decodeURIComponent(code));
  if (!order) notFound();

  return (
    <div>
      <Link
        href="/admin/don-hang"
        className="mb-3.5 inline-flex min-h-11 items-center text-[12.5px] font-extrabold text-accent"
      >
        ← QUAY LẠI DANH SÁCH ĐƠN
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border-soft pb-3.5">
        <div>
          <h1 className="font-mono text-[26px] font-bold lg:text-[34px]">{order.code}</h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            Đặt lúc {formatDateTime(order.createdAt)} ·{" "}
            {order.isGuest ? "Khách vãng lai" : "Thành viên"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={order.status === "CANCELLED" ? "warn" : "ok"}>
            {STATUS_LABEL[order.status]}
          </Badge>
          <Badge tone="neutral">{PAYMENT_LABEL[order.paymentStatus]}</Badge>
          {/* Nhân viên đóng gói cần địa chỉ trên giấy, không phải chép tay. */}
          <Link
            href={`/admin/don-hang/${encodeURIComponent(order.code)}/phieu-giao`}
            className="flex min-h-11 items-center border-2 border-divider px-4 text-[12.5px] font-extrabold"
          >
            IN PHIẾU GIAO
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-3 border-b-2 border-border-soft pb-2.5 text-[18px] font-extrabold">
            Sản phẩm
          </h2>
          <ul>
            {order.items.map((it) => (
              <li key={it.id} className="flex gap-4 border-b border-hairline py-3.5">
                <div className="relative h-[84px] w-[63px] flex-none bg-subtle">
                  {it.imageUrl ? <Photo src={it.imageUrl} alt={it.productName} sizes="63px" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">{it.productName}</p>
                  <p className="label-tech mt-1">
                    {it.sku} · {it.color} · SIZE {it.size}
                  </p>
                  <p className="mt-1 text-[13px] text-muted">
                    {formatVnd(it.unitPrice)} × {it.qty}
                  </p>
                </div>
                <span className="flex-none text-[15px] font-extrabold">
                  {formatVnd(it.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 flex flex-col gap-2 border-t-2 border-border-soft pt-4 text-[14px]">
            <Row label="Tạm tính" value={formatVnd(order.subtotal)} />
            {order.discount > 0 ? (
              <Row
                label={"Giảm giá" + (order.couponCode ? " · " + order.couponCode : "")}
                value={"−" + formatVnd(order.discount)}
              />
            ) : null}
            <Row
              label="Phí giao hàng"
              value={order.shippingFee === 0 ? "Miễn phí" : formatVnd(order.shippingFee)}
            />
          </dl>
          <div className="mt-3 flex items-baseline justify-between border-t-2 border-border-soft pt-3">
            <span className="text-[14px] font-extrabold">TỔNG CỘNG</span>
            <span className="text-[22px] font-extrabold">{formatVnd(order.total)}</span>
          </div>

          <h2 className="mb-3 mt-8 border-b-2 border-border-soft pb-2.5 text-[18px] font-extrabold">
            Lịch sử thao tác
          </h2>
          <ol className="flex flex-col gap-2.5">
            {order.events.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-3 text-[13px]">
                <span className="label-tech">{formatDateTime(e.createdAt)}</span>
                <span className="font-semibold">{STATUS_LABEL[e.status]}</span>
                {e.actorName ? <span className="text-faint">{e.actorName}</span> : null}
                {e.note ? <span className="text-muted">— {e.note}</span> : null}
              </li>
            ))}
          </ol>
        </div>

        <aside className="flex flex-col gap-5">
          {/*
            `key` theo mã vận đơn: nhập mã xong thì lời chặn "phải có mã vận
            đơn" phải biến mất, chứ không nằm lại cạnh câu "đã lưu" và bắt nhân
            viên đoán xem câu nào còn đúng.
          */}
          <OrderStatusPanel
            key={"tt-" + (order.trackingCode ?? "") + order.carrier}
            code={order.code}
            current={order.status}
            next={NEXT_STATUS[order.status]}
            labels={STATUS_LABEL}
          />

          <ShippingPanel
            code={order.code}
            carrier={order.carrier}
            trackingCode={order.trackingCode}
            khoa={order.status === "CANCELLED" || order.status === "RETURNED"}
          />

          <PaymentPanel
            code={order.code}
            method={order.paymentMethod}
            status={order.paymentStatus}
            total={order.total}
            cancelled={order.status === "CANCELLED"}
          />

          <InvoicePanel
            code={order.code}
            invoice={order.invoice}
            vatRequested={order.vatRequested}
          />

          <div className="border-2 border-border-soft p-5">
            <p className="label-tech mb-2 font-bold">NGƯỜI NHẬN</p>
            <p className="text-[14px] font-semibold">{order.receiver}</p>
            <p className="font-mono text-[13px] text-muted">{order.phone}</p>
            {order.email ? <p className="text-[13px] text-muted">{order.email}</p> : null}
            <p className="mt-2 text-[13.5px] leading-[1.6] text-muted">
              {order.street}, {order.ward}, {order.district}, {order.province}
            </p>
            {order.note ? (
              <p className="mt-3 border-t border-hairline pt-3 text-[13px] text-muted">
                Ghi chú: {order.note}
              </p>
            ) : null}
            {order.user ? (
              <p className="mt-3 border-t border-hairline pt-3 text-[13px]">
                Thành viên · <strong className="font-mono">{order.user.pointBalance}</strong> điểm
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
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
