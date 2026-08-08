import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { formatVnd } from "@/lib/money";
import type { OrderDetail } from "@/server/orders";
import { Photo } from "@/components/ui/photo";
import { CARRIER_LABEL } from "@/lib/carriers";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PACKING: "Đang đóng gói",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã huỷ",
  RETURNED: "Đã trả hàng",
};


/** Khối chi tiết đơn dùng chung cho trang cảm ơn và trang tra cứu. */
export function OrderSummary({ order }: { order: OrderDetail }) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        {/*
          Mã đơn phải nằm ngay đầu kết quả. Bản trước không in mã ở đâu cả, nên
          khách tra xong không chắc đang xem đúng đơn nào, và cũng không có gì
          để chép lại khi gọi hỗ trợ.
        */}
        <div className="mb-4 flex flex-wrap items-center gap-3 border-b-2 border-divider pb-3">
          <h2 className="font-mono text-[18px] font-extrabold tracking-[-0.01em]">{order.code}</h2>
          <Badge tone={order.status === "CANCELLED" ? "warn" : "ok"}>
            {STATUS_LABEL[order.status] ?? order.status}
          </Badge>
          <span className="label-tech ml-auto">{formatDateTime(order.createdAt)}</span>
        </div>

        <h3 className="mb-2 text-[15px] font-extrabold">Sản phẩm</h3>

        <ul>
          {order.items.map((it) => (
            <li key={it.id} className="flex gap-4 border-b border-hairline py-4">
              <div className="relative h-[112px] w-[84px] flex-none bg-subtle">
                {it.imageUrl ? <Photo src={it.imageUrl} alt={it.productName} sizes="84px" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold leading-[1.35]">{it.productName}</p>
                <p className="label-tech mt-1">{it.sku}</p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {it.color} · Size {it.size} · SL {it.qty}
                </p>
              </div>
              <span className="flex-none text-[15px] font-extrabold">{formatVnd(it.lineTotal)}</span>
            </li>
          ))}
        </ul>

        {order.events.length > 0 ? (
          <>
            <h2 className="mb-3 mt-8 border-b-2 border-divider pb-3 text-[18px] font-extrabold">
              Lịch sử đơn
            </h2>
            <ol className="flex flex-col gap-2.5">
              {order.events.map((e) => (
                <li key={e.id} className="flex flex-wrap gap-x-3 text-[13px]">
                  <span className="label-tech">{formatDateTime(e.createdAt)}</span>
                  <span className="font-semibold">{STATUS_LABEL[e.status] ?? e.status}</span>
                  {e.note ? <span className="text-muted">— {e.note}</span> : null}
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </div>

      <aside className="border-2 border-divider bg-surface p-5">
        <h2 className="mb-4 text-[16px] font-extrabold">Giao đến</h2>
        <p className="text-[14px] font-semibold">{order.receiver}</p>
        <p className="font-mono text-[13px] text-muted">{order.phone}</p>
        <p className="mt-2 text-[13.5px] leading-[1.6] text-muted">
          {order.street}, {order.ward}, {order.district}, {order.province}
        </p>
        {order.carrier ? (
          <p className="mt-3 border-t border-hairline pt-3 text-[13px]">
            {CARRIER_LABEL[order.carrier] ?? order.carrier}
            {order.trackingCode ? (
              <span className="ml-2 font-mono text-muted">{order.trackingCode}</span>
            ) : null}
          </p>
        ) : null}

        <dl className="mt-4 flex flex-col gap-2 border-t-2 border-divider pt-4 text-[14px]">
          <Row label="Tạm tính" value={formatVnd(order.subtotal)} />
          {order.discount > 0 ? (
            <Row label="Giảm giá" value={"−" + formatVnd(order.discount)} />
          ) : null}
          <Row
            label="Phí giao hàng"
            value={order.shippingFee === 0 ? "Miễn phí" : formatVnd(order.shippingFee)}
          />
        </dl>

        <div className="mt-3 flex items-baseline justify-between border-t-2 border-divider pt-3">
          <span className="text-[14px] font-extrabold uppercase tracking-[0.06em]">Tổng cộng</span>
          <span className="text-[20px] font-extrabold">{formatVnd(order.total)}</span>
        </div>
        <p className="mt-2 text-[12.5px] text-faint">
          {order.paymentMethod === "COD" ? "Thanh toán khi nhận hàng" : order.paymentMethod}
        </p>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
