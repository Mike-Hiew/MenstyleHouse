import { formatVnd, formatVndPlain } from "@/lib/money";
import { docTien } from "@/lib/doc-so";
import type { InvoiceDetail } from "@/server/admin/invoices";
import { CARRIER_LABEL } from "@/lib/carriers";

/**
 * Hai bản in của hoá đơn: A4 794px và phiếu nhiệt 80mm 302px, dựng theo mockup
 * `aInvoice`.
 *
 * Cả hai cố ý **không** dùng token màu của giao diện. Token đổi theo chế độ
 * sáng/tối và theo đợt chỉnh thiết kế, còn tờ hoá đơn là vật chứng kế toán:
 * phải luôn là mực đen trên giấy trắng, in ra hôm nay giống hệt in lại sau ba
 * năm. Nên ở đây ghi thẳng mã màu.
 */

/**
 * Thông tin người bán **đến từ cài đặt cửa hàng**, không phải hằng số trong
 * file này. Trước đây nó nằm ở tám chỗ khác nhau; đổi địa chỉ cửa hàng phải đi
 * sửa từng chỗ và luôn sót một cái.
 */
export type NguoiBan = {
  shopName: string;
  address: string;
  taxCode: string;
  hotline: string;
  bankName: string;
  bankAccount: string;
};

const PAYMENT_LABEL: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  VNPAY: "VNPay",
  MOMO: "MoMo",
  ZALOPAY: "ZaloPay",
};


const ngay = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

/**
 * Các dòng cộng. Ba dòng đầu cộng lại đúng bằng tổng thanh toán; dòng thuế là
 * "trong đó" chứ không cộng thêm — giá bán lẻ ở Việt Nam đã gồm thuế, tách ra
 * rồi cộng lại là lệch.
 */
function congDon(inv: InvoiceDetail) {
  const rows: { k: string; v: string }[] = [
    { k: "Cộng tiền hàng", v: formatVnd(inv.order.subtotal) },
  ];
  if (inv.order.discount > 0) rows.push({ k: "Giảm giá", v: "−" + formatVnd(inv.order.discount) });
  rows.push({
    k: "Phí giao hàng",
    v: inv.order.shippingFee === 0 ? "Miễn phí" : formatVnd(inv.order.shippingFee),
  });
  rows.push({ k: `Trong đó thuế GTGT ${inv.vatRate}%`, v: formatVnd(inv.vatAmount) });
  return rows;
}

const COT = [
  { t: "STT", align: "left" as const },
  { t: "Tên hàng hoá, dịch vụ", align: "left" as const },
  { t: "ĐVT", align: "left" as const },
  { t: "SL", align: "right" as const },
  { t: "Đơn giá", align: "right" as const },
  { t: "Thành tiền", align: "right" as const },
];

/** Bản A4 — 794px là đúng khổ A4 ở 96dpi. */
export function InvoiceA4({ inv, bans }: { inv: InvoiceDetail; bans: NguoiBan }) {
  return (
    <div
      id="to-hoa-don"
      className="mx-auto w-[794px] bg-white p-12 text-[#201e1d] print:m-0 print:p-10 print:shadow-none"
      style={{ boxShadow: "0 12px 32px rgba(45,43,43,.22)" }}
    >
      <header className="flex items-start justify-between border-b-2 border-[#201e1d] pb-[18px]">
        <div className="flex gap-3">
          <span className="block h-[34px] w-[34px] flex-none bg-[#ec3013]" aria-hidden />
          <div>
            <div className="text-[16px] font-extrabold uppercase">{bans.shopName}</div>
            <div className="text-[11.5px] leading-[1.7] text-[#444141]">
              {bans.address}
              <br />
              MST: {bans.taxCode} · Điện thoại: {bans.hotline}
              <br />
              STK: {bans.bankAccount + " — " + bans.bankName}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-extrabold tracking-[-0.02em]">HOÁ ĐƠN GTGT</div>
          <div className="font-mono text-[11px] font-bold leading-[1.8] text-[#444141]">
            Ký hiệu: {inv.symbol}
            <br />
            Số: {inv.number}
            <br />
            Ngày: {ngay(inv.issuedAt)}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-6 border-b border-[#bab6b6] py-[18px]">
        <div>
          <div className="mb-2 font-mono text-[10px] font-bold leading-none tracking-[0.1em] text-[#7d7979]">
            NGƯỜI MUA
          </div>
          <div className="text-[12.5px] leading-[1.8]">
            <strong>{inv.buyerName}</strong>
            <br />
            {inv.buyerAddr}
            <br />
            MST: {inv.buyerTax ?? "—"}
            <br />
            Email: {inv.order.email ?? "—"}
          </div>
        </div>
        <div>
          <div className="mb-2 font-mono text-[10px] font-bold leading-none tracking-[0.1em] text-[#7d7979]">
            THÔNG TIN ĐƠN
          </div>
          <div className="text-[12.5px] leading-[1.8]">
            Mã đơn: <strong className="font-mono">{inv.order.code}</strong>
            <br />
            Hình thức thanh toán: {PAYMENT_LABEL[inv.order.paymentMethod] ?? inv.order.paymentMethod}
            <br />
            Đơn vị vận chuyển:{" "}
            {inv.order.carrier ? (CARRIER_LABEL[inv.order.carrier] ?? inv.order.carrier) : "—"}
          </div>
        </div>
      </div>

      <table className="mt-[18px] w-full border-collapse">
        <thead>
          <tr>
            {COT.map((c) => (
              <th
                key={c.t}
                className="border-b-2 border-t border-[#201e1d] bg-[#f3f2f2] px-2 py-[9px] text-[10.5px] font-extrabold uppercase tracking-[0.06em]"
                style={{ textAlign: c.align }}
              >
                {c.t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inv.order.items.map((it, i) => (
            <tr key={it.id}>
              <td className="border-b border-[#d7d3d3] px-2 py-[10px] text-[12px]">{i + 1}</td>
              <td className="border-b border-[#d7d3d3] px-2 py-[10px] text-[12px]">
                {it.productName}
                <span className="text-[#7d7979]">
                  {" "}
                  — {it.color}, size {it.size}
                </span>
                <br />
                <span className="font-mono text-[10.5px] text-[#7d7979]">{it.sku}</span>
              </td>
              <td className="border-b border-[#d7d3d3] px-2 py-[10px] text-[12px]">Cái</td>
              <td className="border-b border-[#d7d3d3] px-2 py-[10px] text-right font-mono text-[12px]">
                {it.qty}
              </td>
              <td className="border-b border-[#d7d3d3] px-2 py-[10px] text-right font-mono text-[12px]">
                {formatVndPlain(it.unitPrice)}
              </td>
              <td className="border-b border-[#d7d3d3] px-2 py-[10px] text-right font-mono text-[12px]">
                {formatVndPlain(it.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3.5 flex justify-end">
        <div className="w-[320px]">
          {congDon(inv).map((t) => (
            <div
              key={t.k}
              className="flex justify-between border-b border-[#e5e2e2] py-[7px] text-[12.5px]"
            >
              <span>{t.k}</span>
              <span className="font-mono">{t.v}</span>
            </div>
          ))}
          <div className="flex justify-between border-t-2 border-[#201e1d] py-3 text-[15px] font-extrabold">
            <span>TỔNG THANH TOÁN</span>
            <span className="font-mono">{formatVnd(inv.grossAmount)}</span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 text-[12.5px] italic">
        Số tiền bằng chữ: <strong>{docTien(inv.grossAmount)}</strong>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-6 text-center text-[12px]">
        <div>
          <div className="font-extrabold">NGƯỜI MUA HÀNG</div>
          <div className="mt-1 text-[#7d7979]">(Ký, ghi rõ họ tên)</div>
        </div>
        <div>
          <div className="font-extrabold">NGƯỜI BÁN HÀNG</div>
          <div className="mt-1 text-[#7d7979]">(Ký, đóng dấu)</div>
          <div className="mt-11 font-extrabold">{inv.issuedBy?.name ?? ""}</div>
        </div>
      </div>

      <div className="mt-8 border-t border-[#d7d3d3] pt-3 text-center text-[10.5px] text-[#7d7979]">
        Hoá đơn điện tử — tra cứu tại menstylehouse.vn/hoadon với mã {inv.number}
      </div>
    </div>
  );
}

/** Bản phiếu nhiệt 80mm — 302px là bề rộng in được của giấy 80mm ở 96dpi. */
export function InvoiceThermal({ inv, bans }: { inv: InvoiceDetail; bans: NguoiBan }) {
  return (
    <div
      id="to-hoa-don"
      className="mx-auto w-[302px] bg-white p-4 font-mono text-[11px] leading-[1.6] text-[#201e1d] print:m-0 print:shadow-none"
      style={{ boxShadow: "0 12px 32px rgba(45,43,43,.22)" }}
    >
      <div className="border-b border-dashed border-[#201e1d] pb-2.5 text-center">
        <div className="font-sans text-[14px] font-extrabold uppercase">{bans.shopName}</div>
        <div className="text-[10px]">{bans.address}</div>
        <div className="text-[10px]">MST {bans.taxCode.replace(/ /g, "")} · {bans.hotline}</div>
      </div>

      <div className="border-b border-dashed border-[#201e1d] py-2.5">
        <div className="mb-2 text-center font-sans text-[13px] font-extrabold">PHIẾU BÁN HÀNG</div>
        <div>Số HĐ: {inv.number}</div>
        <div>Ngày: {ngay(inv.issuedAt)}</div>
        <div>Đơn: {inv.order.code}</div>
        <div>KH: {inv.buyerName}</div>
      </div>

      <div className="border-b border-dashed border-[#201e1d] py-2">
        {inv.order.items.map((it) => (
          <div key={it.id} className="py-[5px]">
            <div>{it.productName}</div>
            <div className="flex justify-between">
              <span>
                {it.qty} × {formatVndPlain(it.unitPrice)}
              </span>
              <span>{formatVndPlain(it.lineTotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-b border-dashed border-[#201e1d] py-2">
        {congDon(inv).map((t) => (
          <div key={t.k} className="flex justify-between">
            <span>{t.k}</span>
            <span>{t.v}</span>
          </div>
        ))}
        <div className="mt-1.5 flex justify-between font-sans text-[13px] font-extrabold">
          <span>TỔNG</span>
          <span>{formatVnd(inv.grossAmount)}</span>
        </div>
      </div>

      <div className="pt-2.5 text-center text-[10px]">
        <div>Cảm ơn bạn đã mua hàng!</div>
        <div>Đổi trả trong 15 ngày, giữ phiếu này.</div>
        <div className="mt-2 tracking-[1px]">|| ||| | || |||| | ||| ||</div>
        <div>{inv.order.code}</div>
      </div>
    </div>
  );
}
