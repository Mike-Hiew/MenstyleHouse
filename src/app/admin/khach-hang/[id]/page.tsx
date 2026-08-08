import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/server/admin/guard";
import { getCustomer } from "@/server/admin/customers";
import { getSettings } from "@/server/settings";
import { STATUS_LABEL } from "@/server/admin/orders";
import { conThieuLenHang, tierTone } from "@/lib/tiers";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatVnd } from "@/lib/money";

export const dynamic = "force-dynamic";

const POINT_REASON: Record<string, string> = {
  EARN_ORDER: "Tích từ đơn",
  REDEEM_ORDER: "Dùng cho đơn",
  ADJUST: "Điều chỉnh",
  EXPIRE: "Hết hạn",
  REFUND: "Hoàn do huỷ đơn",
};

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("khach-hang.xem");

  const { id } = await params;
  const [kh, nguong] = await Promise.all([getCustomer(id), getSettings()]);
  if (!kh) notFound();

  const con = conThieuLenHang(kh.chiTieu, nguong);

  return (
    <div>
      <Link
        href="/admin/khach-hang"
        className="mb-3.5 inline-flex min-h-11 items-center text-[12.5px] font-extrabold text-accent"
      >
        ← QUAY LẠI KHÁCH HÀNG
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border-soft pb-3.5">
        <div>
          <h1 className="text-[26px] lg:text-[34px]">{kh.name}</h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {kh.phone ?? "chưa có số"}
            {kh.email ? " · " + kh.email : ""} · thành viên từ {formatDate(kh.createdAt)}
          </p>
        </div>
        <Badge tone={tierTone(kh.hang)}>{kh.hang}</Badge>
      </div>

      <dl className="mb-7 grid gap-px border-2 border-divider bg-divider sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Chi tiêu 12 tháng" value={formatVnd(kh.chiTieu)} />
        <Card label="Số đơn tính hạng" value={String(kh.soDon)} />
        <Card label="Điểm hiện có" value={String(kh.pointBalance)} />
        <Card
          label="Lên hạng kế tiếp"
          value={con ? formatVnd(con.thieu) : "Đã cao nhất"}
          hint={con ? `còn thiếu để lên ${con.hang}` : undefined}
        />
      </dl>

      <div className="grid items-start gap-7 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-3 border-b-2 border-border-soft pb-2.5 text-[16px] font-extrabold">
            Đơn gần đây
          </h2>
          {kh.orders.length === 0 ? (
            <p className="border border-dashed border-border-soft bg-subtle px-4 py-6 text-[13.5px] text-muted">
              Khách chưa đặt đơn nào.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    {["MÃ ĐƠN", "NGÀY", "SỐ MÓN", "TRẠNG THÁI", "TỔNG"].map((h, i) => (
                      <th
                        key={h}
                        className={
                          "label-tech whitespace-nowrap border-b-2 border-border-soft py-2 pr-3 font-bold " +
                          (i >= 2 ? "text-right" : "text-left")
                        }
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kh.orders.map((o) => (
                    <tr key={o.code}>
                      <td className="border-b border-hairline py-2 pr-3">
                        <Link
                          href={("/admin/don-hang/" + o.code) as Route}
                          className="font-mono font-semibold underline"
                        >
                          {o.code}
                        </Link>
                      </td>
                      <td className="label-tech border-b border-hairline py-2 pr-3">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="border-b border-hairline py-2 pr-3 text-right font-mono">
                        {o._count.items}
                      </td>
                      <td className="border-b border-hairline py-2 pr-3 text-right">
                        {STATUS_LABEL[o.status]}
                      </td>
                      <td className="border-b border-hairline py-2 text-right font-extrabold">
                        {formatVnd(o.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="mb-3 mt-8 border-b-2 border-border-soft pb-2.5 text-[16px] font-extrabold">
            Sổ điểm
          </h2>
          {kh.pointEntries.length === 0 ? (
            <p className="text-[13.5px] text-muted">Chưa có biến động điểm.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {kh.pointEntries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
                  <span className="label-tech">{formatDateTime(e.createdAt)}</span>
                  <span
                    className={
                      "font-mono font-bold " + (e.delta >= 0 ? "" : "text-accent-700")
                    }
                  >
                    {e.delta > 0 ? "+" : ""}
                    {e.delta}
                  </span>
                  <span className="text-muted">{POINT_REASON[e.reason] ?? e.reason}</span>
                  {e.note ? <span className="text-faint">— {e.note}</span> : null}
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside>
          <h2 className="mb-3 border-b-2 border-border-soft pb-2.5 text-[16px] font-extrabold">
            Sổ địa chỉ
          </h2>
          {kh.addresses.length === 0 ? (
            <p className="text-[13.5px] text-muted">Khách chưa lưu địa chỉ nào.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {kh.addresses.map((a) => (
                <li key={a.id} className="border-2 border-border-soft p-4">
                  <p className="mb-1 flex items-center gap-2">
                    <strong className="text-[14px]">{a.label}</strong>
                    {a.isDefault ? (
                      <span className="bg-accent px-1.5 py-0.5 text-[10px] font-extrabold text-bg">
                        MẶC ĐỊNH
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[13.5px] font-semibold">{a.receiver}</p>
                  <p className="font-mono text-[12.5px] text-muted">{a.phone}</p>
                  <p className="mt-1 text-[13px] leading-[1.6] text-muted">
                    {a.street}, {a.ward}, {a.district}, {a.province}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 border border-dashed border-border-soft bg-subtle px-3.5 py-3 text-[12.5px] leading-[1.6] text-muted">
            Không có chỗ xem hay đổi mật khẩu của khách ở đây — nhân viên không cần và không nên
            nhìn thấy nó.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="label-tech mb-1.5 font-bold text-faint">{label}</dt>
      <dd className="text-[20px] font-extrabold leading-none">{value}</dd>
      {hint ? <p className="mt-1.5 text-[12px] text-faint">{hint}</p> : null}
    </div>
  );
}
