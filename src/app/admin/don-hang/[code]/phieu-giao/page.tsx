import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requirePermission } from "@/server/admin/guard";
import { getOrderForAdmin } from "@/server/admin/orders";
import { getSettings } from "@/server/settings";
import { CARRIER_LABEL } from "@/lib/carriers";
import { formatDateTime } from "@/lib/format";
import { formatVnd } from "@/lib/money";
import { PrintButton } from "@/components/admin/print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Phiếu giao hàng", robots: { index: false } };

/**
 * Phiếu giao hàng để dán lên gói.
 *
 * Trước đây nhân viên đóng gói phải **chép tay địa chỉ** từ màn chi tiết đơn —
 * chép sai một số nhà là hàng đi lạc và cửa hàng chịu phí giao hai lượt.
 *
 * Dùng màu hex đặc chứ không dùng token màu: đây là thứ **in ra giấy**, nó
 * không được đổi theo giao diện. Cùng lý do với bản in hoá đơn.
 */
export default async function PackingSlipPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requirePermission("don.xem");
  const { code } = await params;
  const [don, s] = await Promise.all([getOrderForAdmin(code), getSettings()]);
  if (!don) notFound();

  return (
    <div className="mx-auto max-w-[820px] p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <PrintButton>IN PHIẾU GIAO</PrintButton>
        <span className="text-[13px] text-muted">
          Khổ A5 ngang hoặc A4 đều dán được. Cắt theo viền ngoài.
        </span>
      </div>

      <article
        style={{
          border: "2px solid #201e1d",
          background: "#ffffff",
          color: "#201e1d",
          padding: 24,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, borderBottom: "2px solid #201e1d", paddingBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>{s.shopName}</div>
            <div style={{ fontSize: 11, color: "#605d5d", marginTop: 4, lineHeight: 1.5 }}>
              {s.address}
              <br />
              {s.hotline}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#605d5d" }}>PHIẾU GIAO HÀNG</div>
            <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, marginTop: 4 }}>
              {don.code}
            </div>
            <div style={{ fontSize: 11, color: "#605d5d", marginTop: 2 }}>
              {formatDateTime(don.createdAt)}
            </div>
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, padding: "16px 0", borderBottom: "1px solid #d7d3d3" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#605d5d", marginBottom: 6 }}>NGƯỜI NHẬN</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{don.receiver}</div>
            <div style={{ fontFamily: "monospace", fontSize: 15, marginTop: 2 }}>{don.phone}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 6 }}>
              {don.street}, {don.ward}, {don.district}, {don.province}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#605d5d", marginBottom: 6 }}>VẬN CHUYỂN</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {don.carrier ? (CARRIER_LABEL[don.carrier] ?? don.carrier) : "Chưa chọn hãng"}
            </div>
            {don.trackingCode ? (
              <div style={{ fontFamily: "monospace", fontSize: 15, marginTop: 4 }}>{don.trackingCode}</div>
            ) : null}

            <div style={{ marginTop: 12, border: "2px solid #201e1d", padding: "8px 10px" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#605d5d" }}>
                {don.paymentMethod === "COD" ? "THU HỘ (COD)" : "ĐÃ THANH TOÁN TRƯỚC"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>
                {don.paymentMethod === "COD" && don.paymentStatus !== "PAID"
                  ? formatVnd(don.total)
                  : "0 ₫"}
              </div>
            </div>
          </div>
        </section>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #201e1d" }}>
              <th style={{ textAlign: "left", padding: "8px 4px", fontSize: 11, letterSpacing: "0.06em" }}>SẢN PHẨM</th>
              <th style={{ textAlign: "left", padding: "8px 4px", fontSize: 11, letterSpacing: "0.06em" }}>SKU</th>
              <th style={{ textAlign: "center", padding: "8px 4px", fontSize: 11, letterSpacing: "0.06em" }}>SL</th>
            </tr>
          </thead>
          <tbody>
            {don.items.map((it) => (
              <tr key={it.id} style={{ borderBottom: "1px solid #d7d3d3" }}>
                <td style={{ padding: "9px 4px" }}>
                  {it.productName}
                  <div style={{ color: "#605d5d", fontSize: 12 }}>
                    {it.color} · Size {it.size}
                  </div>
                </td>
                <td style={{ padding: "9px 4px", fontFamily: "monospace", fontSize: 12 }}>{it.sku}</td>
                <td style={{ padding: "9px 4px", textAlign: "center", fontWeight: 800, fontSize: 16 }}>
                  {it.qty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {don.note ? (
          <p style={{ marginTop: 12, fontSize: 13, borderLeft: "3px solid #ec3013", paddingLeft: 10 }}>
            <strong>Ghi chú của khách:</strong> {don.note}
          </p>
        ) : null}

        <footer style={{ marginTop: 16, borderTop: "1px solid #d7d3d3", paddingTop: 10, fontSize: 11, color: "#605d5d" }}>
          Kiểm hàng trước khi thanh toán. Đổi size miễn phí 15 ngày — gọi {s.hotline}.
        </footer>
      </article>
    </div>
  );
}
