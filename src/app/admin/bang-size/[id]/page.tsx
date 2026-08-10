import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requirePermission } from "@/server/admin/guard";
import { danhSachDanhMucVaBang, getSizeChart } from "@/server/admin/size-charts";
import { SizeChartManager } from "@/components/admin/size-chart-manager";
import { DeleteChart } from "@/components/admin/delete-chart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sửa bảng size" };

export default async function SizeChartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("bang-size.quan-ly");
  const { id } = await params;

  const [bang, { danhMuc }] = await Promise.all([getSizeChart(id), danhSachDanhMucVaBang()]);
  if (!bang) notFound();

  const dungO = bang.categories.length;

  return (
    <div>
      <Link
        href="/admin/bang-size"
        className="mb-3.5 inline-flex min-h-11 items-center text-[12.5px] font-extrabold text-accent"
      >
        ← QUAY LẠI BẢNG SIZE
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border-soft pb-3.5">
        <div>
          <h1 className="text-[26px] lg:text-[34px]">{bang.name}</h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {bang.rows.length} dòng size · {bang.columns.length} cột ·{" "}
            {dungO === 0 ? "chưa danh mục nào dùng" : `${dungO} danh mục đang dùng`}
          </p>
        </div>
        <DeleteChart id={bang.id} />
      </div>

      <SizeChartManager
        bang={{
          id: bang.id,
          name: bang.name,
          fit: bang.fit,
          howTo: bang.howTo,
          columns: bang.columns.map((c) => ({
            id: c.id,
            label: c.label,
            key: c.key,
            of: c.of,
            unit: c.unit,
          })),
          /*
           * Một ô cho mỗi cột, đúng thứ tự cột. Tra theo `columnId` chứ không
           * theo thứ tự ô trong DB: ô không có ràng buộc thứ tự nào, chỉ cột mới
           * có. Nhờ dựng từ danh sách cột mà số ô **luôn** khớp số cột — kiểu
           * lệch cột của bản cũ không còn dựng lên được nữa.
           */
          rows: bang.rows.map((r) => {
            const theoCot = new Map(r.cells.map((o) => [o.columnId, o]));
            return {
              id: r.id,
              size: r.size,
              values: bang.columns.map((c) => {
                const o = theoCot.get(c.id);
                if (!o) return "";
                if (o.text !== null) return o.text;
                if (o.min === null) return "";
                return o.max === null || o.max === o.min ? String(o.min) : `${o.min}-${o.max}`;
              }),
            };
          }),
        }}
        danhMuc={danhMuc.map((d) => ({ id: d.id, name: d.name, sizeChartId: d.sizeChartId }))}
      />
    </div>
  );
}
