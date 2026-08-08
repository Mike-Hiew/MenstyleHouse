import Link from "next/link";
import type { Route } from "next";
import { DataTable, type ColumnMeta, type TableRow } from "@/components/admin/data-table";
import { requirePermission } from "@/server/admin/guard";
import { listInvoices } from "@/server/admin/invoices";
import {
  parseTableQuery,
  serializeTableQuery,
  TABLE_PAGE_SIZE,
  type RawParams,
} from "@/lib/table-params";
import { formatDateTime } from "@/lib/format";
import { formatVnd } from "@/lib/money";

export const dynamic = "force-dynamic";

const COLUMNS: ColumnMeta[] = [
  { key: "number", label: "SỐ HOÁ ĐƠN", card: "title" },
  { key: "order", label: "ĐƠN HÀNG", card: "meta" },
  { key: "buyer", label: "NGƯỜI MUA", card: "meta" },
  { key: "tax", label: "MST", card: "hide" },
  { key: "issuedAt", label: "NGÀY PHÁT HÀNH", sortable: true, card: "foot" },
  { key: "gross", label: "TỔNG TIỀN", align: "right", card: "foot-end" },
];

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  await requirePermission("hoa-don.xem");

  const query = parseTableQuery(await searchParams);
  const { rows, total } = await listInvoices(query);

  const tableRows: TableRow[] = rows.map((inv) => ({
    id: inv.id,
    csv: {
      number: inv.symbol + "-" + inv.number,
      order: inv.order.code,
      buyer: inv.buyerName,
      tax: inv.buyerTax ?? "",
      issuedAt: formatDateTime(inv.issuedAt),
      gross: inv.grossAmount,
    },
    cells: [
      <Link
        key="no"
        href={("/admin/hoa-don/" + inv.symbol + "-" + inv.number) as Route}
        className="font-mono font-semibold underline"
      >
        {inv.number}
      </Link>,
      <Link
        key="order"
        href={("/admin/don-hang/" + inv.order.code) as Route}
        className="font-mono text-muted underline"
      >
        {inv.order.code}
      </Link>,
      <span key="buyer">{inv.buyerName}</span>,
      <span key="tax" className="font-mono text-muted">
        {inv.buyerTax ?? "—"}
      </span>,
      <span key="at" className="label-tech">
        {formatDateTime(inv.issuedAt)}
      </span>,
      <span key="gross" className="font-extrabold">
        {formatVnd(inv.grossAmount)}
      </span>,
    ],
  }));

  return (
    <DataTable
      basePath="/admin/hoa-don"
      params={serializeTableQuery(query).toString()}
      title="Hoá đơn"
      subtitle="Hoá đơn GTGT đã phát hành. Số đã cấp thì không sửa, không xoá."
      columns={COLUMNS}
      rows={tableRows}
      total={total}
      page={query.trang}
      pageSize={TABLE_PAGE_SIZE}
      searchPlaceholder="Tìm số hoá đơn, mã đơn, tên người mua hoặc MST…"
      csvName="hoa-don"
    />
  );
}
