import Link from "next/link";
import { requirePermission } from "@/server/admin/guard";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnMeta, type TableRow } from "@/components/admin/data-table";
import { listAdminProducts } from "@/server/admin/products";
import { listCategories, listBrands } from "@/server/admin/catalog-admin";
import {
  parseTableQuery,
  serializeTableQuery,
  TABLE_PAGE_SIZE,
  type RawParams,
} from "@/lib/table-params";
import { formatVnd } from "@/lib/money";
import { Photo } from "@/components/ui/photo";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang bán",
  DRAFT: "Nháp",
  ARCHIVED: "Lưu trữ",
};

const COLUMNS: ColumnMeta[] = [
  { key: "name", label: "SẢN PHẨM", sortable: true, card: "title" },
  { key: "category", label: "DANH MỤC", sortable: true, card: "meta" },
  { key: "status", label: "TRẠNG THÁI", sortable: true, card: "badge" },
  { key: "variants", label: "BIẾN THỂ", align: "right", sortable: true, card: "hide" },
  { key: "stock", label: "TỒN", align: "right", sortable: true, card: "foot" },
  { key: "basePrice", label: "GIÁ", align: "right", sortable: true, card: "foot-end" },
];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  await requirePermission("san-pham.xem");
  const raw = await searchParams;
  const query = parseTableQuery(raw);
  const danhMuc = typeof raw.danhMuc === "string" ? raw.danhMuc : "";
  const thuongHieu = typeof raw.thuongHieu === "string" ? raw.thuongHieu : "";

  const [{ rows, total, tabs }, categories, brands] = await Promise.all([
    listAdminProducts(query, { danhMuc, thuongHieu }),
    listCategories(),
    listBrands(),
  ]);

  const tableRows: TableRow[] = rows.map((p) => ({
    id: p.id,
    csv: {
      name: p.name,
      category: p.category.name,
      status: STATUS_LABEL[p.status] ?? p.status,
      variants: p.variantCount,
      stock: p.stock,
      basePrice: p.salePrice ?? p.basePrice,
    },
    cells: [
      <span key="name" className="flex items-center gap-3">
        <span className="relative block h-11 w-9 flex-none bg-subtle">
          {p.images[0] ? <Photo src={p.images[0].url} alt="" sizes="36px" /> : null}
        </span>
        <Link
          href={("/admin/san-pham/" + p.slug) as Route}
          className="min-w-0 font-semibold underline"
        >
          {p.name}
        </Link>
      </span>,
      <span key="cat" className="text-muted">
        {p.category.name}
        {p.brand ? " · " + p.brand.name : ""}
      </span>,
      <Badge key="status" tone={p.status === "ACTIVE" ? "ok" : "neutral"}>
        {STATUS_LABEL[p.status] ?? p.status}
      </Badge>,
      <span key="var" className="font-mono">
        {p.variantCount}
      </span>,
      <span key="stock" className={p.stock === 0 ? "font-extrabold text-accent-700" : "font-mono"}>
        {p.stock === 0 ? "Hết hàng" : p.stock}
      </span>,
      <span key="price" className="font-extrabold">
        {formatVnd(p.salePrice ?? p.basePrice)}
      </span>,
    ],
  }));

  return (
    <DataTable
      basePath="/admin/san-pham"
      params={serializeTableQuery(query, { danhMuc, thuongHieu }).toString()}
      title="Sản phẩm"
      subtitle={`${total} sản phẩm · ${categories.length} danh mục · ${brands.length} thương hiệu`}
      action={{ label: "+ THÊM SẢN PHẨM", href: "/admin/san-pham/moi" }}
      filters={[
        {
          key: "danhMuc",
          label: "Tất cả danh mục",
          options: categories.map((c) => ({ value: c.slug, label: c.name })),
        },
        {
          key: "thuongHieu",
          label: "Tất cả thương hiệu",
          options: brands.map((b) => ({ value: b.name, label: b.name })),
        },
      ]}
      tabs={tabs}
      columns={COLUMNS}
      rows={tableRows}
      total={total}
      page={query.trang}
      pageSize={TABLE_PAGE_SIZE}
      searchPlaceholder="Tìm theo tên, mã, thương hiệu hoặc SKU…"
      csvName="san-pham"
    />
  );
}
