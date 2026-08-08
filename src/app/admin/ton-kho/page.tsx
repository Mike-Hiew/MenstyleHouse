import Link from "next/link";
import { requirePermission } from "@/server/admin/guard";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnMeta, type TableRow } from "@/components/admin/data-table";
import { AdjustStockForm } from "@/components/admin/adjust-stock-form";
import { listStock } from "@/server/admin/inventory";
import {
  parseTableQuery,
  serializeTableQuery,
  TABLE_PAGE_SIZE,
  type RawParams,
} from "@/lib/table-params";

export const dynamic = "force-dynamic";

const COLUMNS: ColumnMeta[] = [
  { key: "sku", label: "SKU", sortable: true, card: "code" },
  { key: "product", label: "SẢN PHẨM", card: "title" },
  { key: "variant", label: "MÀU · SIZE", card: "meta" },
  { key: "state", label: "TÌNH TRẠNG", card: "badge" },
  { key: "lowStockAt", label: "NGƯỠNG", align: "right", card: "foot" },
  { key: "stock", label: "TỒN", align: "right", sortable: true, card: "foot-end" },
];

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  await requirePermission("kho.xem");
  const query = parseTableQuery(await searchParams);
  const { rows, total, tabs } = await listStock(query);

  const tableRows: TableRow[] = rows.map((v) => {
    const out = v.stock <= 0;
    const low = !out && v.stock <= v.lowStockAt;

    return {
      id: v.id,
      csv: {
        sku: v.sku,
        product: v.product.name,
        variant: v.color + " · " + v.size,
        state: out ? "Hết hàng" : low ? "Sắp hết" : "Đủ hàng",
        lowStockAt: v.lowStockAt,
        stock: v.stock,
      },
      cells: [
        <span key="sku" className="font-mono font-bold">
          {v.sku}
        </span>,
        <Link
          key="p"
          href={("/admin/san-pham/" + v.product.slug) as Route}
          className="font-semibold underline"
        >
          {v.product.name}
        </Link>,
        <span key="v" className="flex items-center gap-2 text-muted">
          <span
            className="h-3.5 w-3.5 flex-none border border-hairline"
            style={{ background: v.colorHex }}
            aria-hidden
          />
          {v.color} · {v.size}
        </span>,
        <Badge key="s" tone={out ? "warn" : low ? "accent" : "neutral"}>
          {out ? "Hết hàng" : low ? "Sắp hết" : "Đủ hàng"}
        </Badge>,
        <span key="th" className="font-mono text-faint">
          {v.lowStockAt}
        </span>,
        <span
          key="st"
          className={out ? "font-extrabold text-accent-700" : low ? "font-extrabold" : "font-mono"}
        >
          {v.stock}
        </span>,
      ],
    };
  });

  return (
    <div>
      <AdjustStockForm />
      <DataTable
      basePath="/admin/ton-kho"
      params={serializeTableQuery(query).toString()}
      title="Tồn kho"
      subtitle="Tồn theo từng SKU. Muốn đổi tồn phải lập phiếu nhập hoặc phiếu điều chỉnh."
      action={{ label: "TẠO PHIẾU NHẬP", href: "/admin/nhap-kho" }}
      tabs={tabs}
      columns={COLUMNS}
      rows={tableRows}
      total={total}
      page={query.trang}
      pageSize={TABLE_PAGE_SIZE}
      searchPlaceholder="Tìm SKU hoặc tên sản phẩm…"
      csvName="ton-kho"
      />
    </div>
  );
}
