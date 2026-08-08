import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnMeta, type TableRow } from "@/components/admin/data-table";
import { CatalogMeta, type MetaRow } from "@/components/admin/catalog-meta";
import { requirePermission } from "@/server/admin/guard";
import { listBrands, listCategories } from "@/server/admin/catalog-admin";
import {
  parseTableQuery,
  serializeTableQuery,
  TABLE_PAGE_SIZE,
  type RawParams,
} from "@/lib/table-params";

export const dynamic = "force-dynamic";

/**
 * Màn `cats` trong mockup: **một** bảng gộp cả danh mục lẫn thương hiệu, cột
 * Tên · Loại · Số sản phẩm · Trạng thái. Dùng chung `DataTable` như mọi bảng
 * admin khác, đúng như mockup dựng nó.
 */
const COLUMNS: ColumnMeta[] = [
  { key: "name", label: "TÊN", card: "title" },
  { key: "loai", label: "LOẠI", card: "meta" },
  { key: "soSanPham", label: "SỐ SẢN PHẨM", align: "right", card: "foot" },
  { key: "trangThai", label: "TRẠNG THÁI", card: "badge" },
];

export default async function AdminCatalogMetaPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  await requirePermission("danh-muc.quan-ly");

  const query = parseTableQuery(await searchParams);
  const [categories, brands] = await Promise.all([listCategories(), listBrands()]);

  const all: MetaRow[] = [
    ...categories.map((c) => ({
      id: c.id,
      loai: "Danh mục" as const,
      name: c.name,
      slug: c.slug,
      sort: c.sort,
      soSanPham: c._count.products,
    })),
    ...brands.map((b) => ({
      id: b.id,
      loai: "Thương hiệu" as const,
      name: b.name,
      slug: null,
      sort: 0,
      soSanPham: b._count.products,
    })),
  ];

  const q = query.q.trim().toLowerCase();
  const loc = q ? all.filter((r) => r.name.toLowerCase().includes(q)) : all;
  const trang = loc.slice((query.trang - 1) * TABLE_PAGE_SIZE, query.trang * TABLE_PAGE_SIZE);

  const rows: TableRow[] = trang.map((r) => ({
    id: r.id,
    csv: { name: r.name, loai: r.loai, soSanPham: r.soSanPham, trangThai: "Hiển thị" },
    cells: [
      <span key="name" className="font-semibold">
        {r.name}
      </span>,
      <span key="loai" className="text-muted">
        {r.loai}
      </span>,
      <span key="so" className="font-mono">
        {r.soSanPham}
      </span>,
      <Badge key="tt" tone={r.soSanPham > 0 ? "ok" : "neutral"}>
        {r.soSanPham > 0 ? "Hiển thị" : "Chưa dùng"}
      </Badge>,
    ],
  }));

  return (
    <div>
      <DataTable
        basePath="/admin/danh-muc"
        params={serializeTableQuery(query).toString()}
        title="Danh mục & thương hiệu"
        subtitle={`${categories.length} danh mục và ${brands.length} thương hiệu đang hoạt động`}
        columns={COLUMNS}
        rows={rows}
        total={loc.length}
        page={query.trang}
        pageSize={TABLE_PAGE_SIZE}
        searchPlaceholder="Tìm danh mục, thương hiệu…"
        csvName="danh-muc-thuong-hieu"
      />

      <CatalogMeta rows={all} />
    </div>
  );
}
