import Link from "next/link";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnMeta, type TableRow } from "@/components/admin/data-table";
import { requirePermission } from "@/server/admin/guard";
import { listCustomers } from "@/server/admin/customers";
import { getSettings } from "@/server/settings";
import { tierTone } from "@/lib/tiers";
import {
  parseTableQuery,
  serializeTableQuery,
  TABLE_PAGE_SIZE,
  type RawParams,
} from "@/lib/table-params";
import { formatVnd } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Năm cột đúng màn `customers` trong mockup.
 *
 * Cột HẠNG biến mất khi cửa hàng tắt chương trình hạng trong Cài đặt — nhìn một
 * cột luôn ghi "MỚI" cho mọi khách thì thà đừng bày.
 */
function cotCho(batHang: boolean): ColumnMeta[] {
  return [
    { key: "name", label: "KHÁCH HÀNG", sortable: true, card: "title" },
    { key: "phone", label: "SỐ ĐIỆN THOẠI", sortable: true, card: "meta" },
    { key: "soDon", label: "SỐ ĐƠN", align: "right", sortable: true, card: "foot" },
    { key: "chiTieu", label: "TỔNG CHI TIÊU", align: "right", sortable: true, card: "foot-end" },
    ...(batHang
      ? ([{ key: "hang", label: "HẠNG", sortable: true, card: "badge" }] as ColumnMeta[])
      : []),
  ];
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  await requirePermission("khach-hang.xem");

  const query = parseTableQuery(await searchParams);
  const [{ rows, total }, caiDat] = await Promise.all([listCustomers(query), getSettings()]);
  const batHang = caiDat.tiersEnabled;

  const tableRows: TableRow[] = rows.map((c) => ({
    id: c.id,
    csv: {
      name: c.name,
      phone: c.phone ?? "",
      soDon: c.soDon,
      chiTieu: c.chiTieu,
      ...(batHang ? { hang: c.hang } : {}),
    },
    cells: [
      <Link
        key="name"
        href={("/admin/khach-hang/" + c.id) as Route}
        className="font-semibold underline"
      >
        {c.name}
      </Link>,
      <span key="ph" className="font-mono text-muted">
        {c.phone ?? "—"}
      </span>,
      <span key="sd" className="font-mono">
        {c.soDon}
      </span>,
      <span key="ct" className="font-extrabold">
        {formatVnd(c.chiTieu)}
      </span>,
      ...(batHang
        ? [
            <Badge key="hg" tone={tierTone(c.hang)}>
              {c.hang}
            </Badge>,
          ]
        : []),
    ],
  }));

  return (
    <DataTable
      basePath="/admin/khach-hang"
      params={serializeTableQuery(query).toString()}
      title="Khách hàng"
      subtitle={
        batHang
          ? `${total} khách hàng · phân hạng theo tổng chi tiêu 12 tháng`
          : `${total} khách hàng`
      }
      action={{ label: "+ THÊM KHÁCH HÀNG", href: "/admin/khach-hang/moi" }}
      columns={cotCho(batHang)}
      rows={tableRows}
      total={total}
      page={query.trang}
      pageSize={TABLE_PAGE_SIZE}
      searchPlaceholder="Tìm tên khách hàng…"
      csvName="khach-hang"
    />
  );
}
