import Link from "next/link";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnMeta, type TableRow } from "@/components/admin/data-table";
import { requirePermission } from "@/server/admin/guard";
import { listTickets } from "@/server/admin/tickets";
import { TICKET_STATUS_LABEL } from "@/server/tickets";
import {
  parseTableQuery,
  serializeTableQuery,
  TABLE_PAGE_SIZE,
  type RawParams,
} from "@/lib/table-params";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Năm cột đúng màn `support` trong mockup. */
const COLUMNS: ColumnMeta[] = [
  { key: "code", label: "MÃ YC", sortable: true, card: "title" },
  { key: "khach", label: "KHÁCH HÀNG", card: "meta" },
  { key: "subject", label: "NỘI DUNG", sortable: true, card: "meta" },
  { key: "date", label: "NGÀY GỬI", sortable: true, card: "foot" },
  { key: "status", label: "TRẠNG THÁI", sortable: true, card: "badge" },
];

const TONE: Record<string, "ok" | "warn" | "neutral"> = {
  OPEN: "warn",
  PENDING: "warn",
  RESOLVED: "ok",
  CLOSED: "neutral",
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  await requirePermission("ho-tro.tra-loi");

  const query = parseTableQuery(await searchParams);
  const { rows, total, tabs, chuaXuLy } = await listTickets(query);

  const tableRows: TableRow[] = rows.map((t) => {
    const khach = t.messages[0]?.authorName ?? "—";
    return {
      id: t.id,
      csv: {
        code: t.code,
        khach,
        subject: t.subject,
        date: formatDate(t.createdAt),
        status: TICKET_STATUS_LABEL[t.status],
      },
      cells: [
        <Link
          key="code"
          href={("/admin/ho-tro/" + t.code) as Route}
          className="font-mono font-semibold underline"
        >
          {t.code}
        </Link>,
        <span key="kh" className="font-semibold">
          {khach}
        </span>,
        <span key="sj" className="text-muted">
          {t.subject}
          {t.orderCode ? <span className="ml-2 font-mono text-[12px]">{t.orderCode}</span> : null}
        </span>,
        <span key="dt" className="label-tech">
          {formatDate(t.createdAt)}
        </span>,
        <Badge key="st" tone={TONE[t.status] ?? "neutral"}>
          {TICKET_STATUS_LABEL[t.status].toUpperCase()}
        </Badge>,
      ],
    };
  });

  return (
    <DataTable
      basePath="/admin/ho-tro"
      params={serializeTableQuery(query).toString()}
      title="Hỗ trợ"
      subtitle={`${total} yêu cầu từ form liên hệ · ${chuaXuLy} yêu cầu chưa xử lý`}
      tabs={tabs}
      columns={COLUMNS}
      rows={tableRows}
      total={total}
      page={query.trang}
      pageSize={TABLE_PAGE_SIZE}
      searchPlaceholder="Tìm mã yêu cầu, khách, nội dung…"
      csvName="ho-tro"
    />
  );
}
