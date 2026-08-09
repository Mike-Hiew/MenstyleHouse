import Link from "next/link";
import { requirePermission } from "@/server/admin/guard";
import { doiTrangThaiHangLoatAction } from "@/app/admin/actions";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnMeta, type TableRow } from "@/components/admin/data-table";
import { listOrders, PAYMENT_LABEL, STATUS_LABEL } from "@/server/admin/orders";
import {
  parseTableQuery,
  serializeTableQuery,
  TABLE_PAGE_SIZE,
  type RawParams,
} from "@/lib/table-params";
import { formatDateTime } from "@/lib/format";
import { formatVnd } from "@/lib/money";

export const dynamic = "force-dynamic";

/** Cột chỉ mang metadata — ô được render sẵn ở server rồi truyền xuống. */
const COLUMNS: ColumnMeta[] = [
  { key: "code", label: "MÃ ĐƠN", sortable: true, card: "code" },
  { key: "receiver", label: "KHÁCH", sortable: true, card: "title" },
  { key: "province", label: "NƠI NHẬN", sortable: true, card: "meta" },
  { key: "status", label: "TRẠNG THÁI", sortable: true, card: "badge" },
  { key: "paymentStatus", label: "THANH TOÁN", sortable: true, card: "hide" },
  { key: "createdAt", label: "NGÀY ĐẶT", sortable: true, card: "foot" },
  { key: "total", label: "TỔNG TIỀN", align: "right", sortable: true, card: "foot-end" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  await requirePermission("don.xem");
  const query = parseTableQuery(await searchParams);
  const { rows, total, tabs } = await listOrders(query);

  const tableRows: TableRow[] = rows.map((r) => ({
    id: r.id,
    csv: {
      code: r.code,
      receiver: r.receiver,
      province: r.province,
      status: STATUS_LABEL[r.status],
      paymentStatus: PAYMENT_LABEL[r.paymentStatus],
      createdAt: formatDateTime(r.createdAt),
      total: r.total,
    },
    cells: [
      <Link
        key="code"
        href={("/admin/don-hang/" + r.code) as Route}
        className="font-mono font-bold underline"
      >
        {r.code}
      </Link>,
      <span key="receiver">
        <span className="block font-semibold">{r.receiver}</span>
        <span className="block font-mono text-[12px] text-faint">{r.phone}</span>
      </span>,
      <span key="province" className="text-muted">
        {r.province} · {r._count.items} món · {r.paymentMethod}
      </span>,
      <Badge
        key="status"
        tone={r.status === "CANCELLED" ? "warn" : r.status === "DELIVERED" ? "ok" : "neutral"}
      >
        {STATUS_LABEL[r.status]}
      </Badge>,
      <span key="pay" className="text-muted">
        {PAYMENT_LABEL[r.paymentStatus]}
      </span>,
      <span key="date" className="font-mono text-[12px] text-faint">
        {formatDateTime(r.createdAt)}
      </span>,
      <span key="total" className="font-extrabold">
        {formatVnd(r.total)}
      </span>,
    ],
  }));

  return (
    <DataTable
      basePath="/admin/don-hang"
      params={serializeTableQuery(query).toString()}
      title="Đơn hàng"
      subtitle="Xử lý đơn từ lúc khách đặt tới lúc giao xong."
      tabs={tabs}
      columns={COLUMNS}
      rows={tableRows}
      total={total}
      page={query.trang}
      pageSize={TABLE_PAGE_SIZE}
      searchPlaceholder="Tìm mã đơn, tên hoặc SĐT…"
      csvName="don-hang"
      hangLoat={[
        { key: "xac-nhan", label: "Xác nhận" },
        { key: "dong-goi", label: "Chuyển đóng gói" },
        {
          key: "huy",
          label: "Huỷ đơn",
          hoiLai: "Huỷ {n} đơn? Hàng trả lại kho, điểm và lượt mã giảm giá hoàn về. Không lùi được.",
        },
      ]}
      onHangLoat={doiTrangThaiHangLoatAction}
    />
  );
}
