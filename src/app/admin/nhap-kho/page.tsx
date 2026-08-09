import Link from "next/link";
import { requirePermission } from "@/server/admin/guard";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnMeta, type TableRow } from "@/components/admin/data-table";
import { NewReceiptForm } from "@/components/admin/new-receipt-form";
import {
  listReceipts,
  listWarehousesAndSuppliers,
  RECEIPT_STATUS_LABEL,
} from "@/server/admin/receipts";
import {
  parseTableQuery,
  serializeTableQuery,
  TABLE_PAGE_SIZE,
  type RawParams,
} from "@/lib/table-params";
import { formatDate } from "@/lib/format";
import { formatVnd } from "@/lib/money";

export const dynamic = "force-dynamic";

const COLUMNS: ColumnMeta[] = [
  { key: "code", label: "MÃ PHIẾU", sortable: true, card: "code" },
  { key: "supplier", label: "NHÀ CUNG CẤP", card: "title" },
  { key: "warehouse", label: "KHO", card: "meta" },
  { key: "status", label: "TRẠNG THÁI", sortable: true, card: "badge" },
  { key: "lines", label: "SỐ DÒNG", align: "right", card: "hide" },
  { key: "createdAt", label: "NGÀY TẠO", sortable: true, card: "foot" },
  { key: "grossAmount", label: "TỔNG TIỀN", align: "right", sortable: true, card: "foot-end" },
];

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  await requirePermission("kho.ghi-so");
  const query = parseTableQuery(await searchParams);
  const [{ rows, total, tabs }, options] = await Promise.all([
    listReceipts(query),
    listWarehousesAndSuppliers(),
  ]);

  const tableRows: TableRow[] = rows.map((r) => ({
    id: r.id,
    csv: {
      code: r.code,
      supplier: r.supplier.name,
      warehouse: r.warehouse.name,
      status: RECEIPT_STATUS_LABEL[r.status],
      lines: r._count.lines,
      createdAt: formatDate(r.createdAt),
      grossAmount: r.grossAmount,
    },
    cells: [
      <Link key="c" href={("/admin/nhap-kho/" + r.code) as Route} className="font-mono font-bold underline">
        {r.code}
      </Link>,
      <span key="s" className="font-semibold">{r.supplier.name}</span>,
      <span key="w" className="text-muted">
        {r.warehouse.name}
        {r.refDoc ? " · " + r.refDoc : ""}
      </span>,
      <Badge key="st" tone={r.status === "POSTED" ? "ok" : r.status === "CANCELLED" ? "warn" : "neutral"}>
        {RECEIPT_STATUS_LABEL[r.status]}
      </Badge>,
      <span key="l" className="font-mono">{r._count.lines}</span>,
      <span key="d" className="font-mono text-[12px] text-faint">{formatDate(r.createdAt)}</span>,
      <span key="g" className="font-extrabold">{formatVnd(r.grossAmount)}</span>,
    ],
  }));

  return (
    <div>
      <NewReceiptForm warehouses={options.warehouses} suppliers={options.suppliers} />
      <DataTable
        basePath="/admin/nhap-kho"
        params={serializeTableQuery(query).toString()}
        title="Phiếu nhập kho"
        subtitle="Ghi sổ là một chiều — phiếu đã ghi thì không sửa, sai thì lập phiếu điều chỉnh."
        tabs={tabs}
        columns={COLUMNS}
        rows={tableRows}
        total={total}
        page={query.trang}
        pageSize={TABLE_PAGE_SIZE}
        searchPlaceholder="Tìm mã phiếu, chứng từ hoặc nhà cung cấp…"
        csvName="phieu-nhap"
      />
    </div>
  );
}
