import Link from "next/link";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnMeta, type TableRow } from "@/components/admin/data-table";
import { requirePermission } from "@/server/admin/guard";
import { COUPON_TYPE_LABEL, dangChay, listCoupons } from "@/server/admin/coupons";
import {
  parseTableQuery,
  serializeTableQuery,
  TABLE_PAGE_SIZE,
  type RawParams,
} from "@/lib/table-params";
import { formatDate } from "@/lib/format";
import { formatVnd } from "@/lib/money";

export const dynamic = "force-dynamic";

/** Bảy cột đúng màn `promos` trong mockup. */
const COLUMNS: ColumnMeta[] = [
  { key: "code", label: "MÃ", card: "title" },
  { key: "type", label: "LOẠI", card: "meta" },
  { key: "value", label: "GIÁ TRỊ", align: "right", card: "foot" },
  { key: "min", label: "ĐƠN TỐI THIỂU", align: "right", card: "hide" },
  { key: "uses", label: "LƯỢT DÙNG", align: "right", card: "foot-end" },
  { key: "end", label: "HẠN DÙNG", card: "meta" },
  { key: "status", label: "TRẠNG THÁI", card: "badge" },
];

export default async function AdminPromosPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  await requirePermission("khuyen-mai.quan-ly");

  const query = parseTableQuery(await searchParams);
  const { rows, total, tabs } = await listCoupons(query);
  const now = new Date();

  const tableRows: TableRow[] = rows.map((c) => {
    const chay = dangChay(c, now);
    const giaTri =
      c.type === "PERCENT"
        ? c.value + "%"
        : c.type === "FREESHIP"
          ? "Miễn ship"
          : formatVnd(c.value);

    return {
      id: c.id,
      csv: {
        code: c.code,
        type: COUPON_TYPE_LABEL[c.type],
        value: giaTri,
        min: c.minSubtotal,
        uses: c.usageLimit ? `${c.usedCount}/${c.usageLimit}` : String(c.usedCount),
        end: formatDate(c.endsAt),
        status: chay ? "Đang chạy" : "Hết hạn",
      },
      cells: [
        <Link
          key="code"
          href={("/admin/khuyen-mai/" + c.id) as Route}
          className="font-mono font-semibold underline"
        >
          {c.code}
        </Link>,
        <span key="type" className="text-muted">
          {COUPON_TYPE_LABEL[c.type]}
          {c.memberOnly ? " · thành viên" : ""}
        </span>,
        <span key="value" className="font-extrabold">
          {giaTri}
        </span>,
        <span key="min" className="font-mono text-muted">
          {c.minSubtotal > 0 ? formatVnd(c.minSubtotal) : "—"}
        </span>,
        <span key="uses" className="font-mono">
          {c.usageLimit ? `${c.usedCount}/${c.usageLimit}` : c.usedCount}
        </span>,
        <span key="end" className="label-tech">
          {formatDate(c.endsAt)}
        </span>,
        <Badge key="st" tone={chay ? "ok" : "warn"}>
          {chay ? "ĐANG CHẠY" : "HẾT HẠN"}
        </Badge>,
      ],
    };
  });

  return (
    <DataTable
      basePath="/admin/khuyen-mai"
      params={serializeTableQuery(query).toString()}
      title="Khuyến mãi"
      subtitle={`${total} mã giảm giá · ${tableRows.filter((r) => r.csv.status === "Đang chạy").length} mã đang chạy`}
      action={{ label: "+ TẠO MÃ GIẢM GIÁ", href: "/admin/khuyen-mai/moi" }}
      tabs={tabs}
      columns={COLUMNS}
      rows={tableRows}
      total={total}
      page={query.trang}
      pageSize={TABLE_PAGE_SIZE}
      searchPlaceholder="Tìm mã giảm giá…"
      csvName="khuyen-mai"
    />
  );
}
