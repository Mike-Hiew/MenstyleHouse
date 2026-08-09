import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { requirePermission } from "@/server/admin/guard";
import { danhSachDanhMucVaBang, listSizeCharts } from "@/server/admin/size-charts";
import { NewSizeChart } from "@/components/admin/new-size-chart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Bảng size" };

export default async function SizeChartsPage() {
  await requirePermission("bang-size.quan-ly");
  const [bang, { danhMuc }] = await Promise.all([listSizeCharts(), danhSachDanhMucVaBang()]);

  const chuaGan = danhMuc.filter((d) => !d.sizeChartId);

  return (
    <div>
      <div className="mb-6 border-b-2 border-border-soft pb-3.5">
        <h1 className="text-[26px] lg:text-[34px]">Bảng size</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Mỗi nhóm hàng một bảng riêng. Trang sản phẩm lấy bảng của danh mục, trừ khi sản phẩm đó
          được gán bảng riêng.
        </p>
      </div>

      <NewSizeChart />

      {chuaGan.length > 0 ? (
        <p className="mb-6 border-2 border-border-soft bg-subtle px-4 py-3 text-[13px] leading-[1.7]">
          <strong className="font-extrabold">{chuaGan.length} danh mục chưa có bảng size:</strong>{" "}
          {chuaGan.map((d) => d.name).join(", ")}. Khách xem sản phẩm trong đó sẽ không có gì để
          đối chiếu số đo — trừ khi đó là hàng chỉ có Freesize.
        </p>
      ) : null}

      {bang.length === 0 ? (
        <p className="border border-dashed border-border-soft bg-subtle px-5 py-10 text-[14px] text-muted">
          Chưa có bảng size nào.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["TÊN BẢNG", "SỐ CỘT", "SỐ DÒNG", "DANH MỤC DÙNG", "SẢN PHẨM GÁN RIÊNG"].map(
                  (h) => (
                    <th
                      key={h}
                      className="label-tech whitespace-nowrap border-b-2 border-border-soft py-2.5 pr-3 text-left font-bold"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {bang.map((b) => (
                <tr key={b.id}>
                  <td className="border-b border-hairline py-3 pr-3">
                    <Link
                      href={("/admin/bang-size/" + b.id) as Route}
                      className="font-semibold underline"
                    >
                      {b.name}
                    </Link>
                    {b.fit ? (
                      <span className="mt-0.5 block text-[12px] text-muted">{b.fit}</span>
                    ) : null}
                  </td>
                  <td className="border-b border-hairline py-3 pr-3 font-mono">
                    {b.columns.length}
                  </td>
                  {/*
                    Bảng không có dòng nào thì trang sản phẩm không hiện gì cả —
                    tô đỏ để người quản trị thấy ngay, thay vì tưởng đã xong.
                  */}
                  <td
                    className={
                      "border-b border-hairline py-3 pr-3 font-mono " +
                      (b._count.rows === 0 ? "font-bold text-accent-700" : "")
                    }
                  >
                    {b._count.rows}
                    {b._count.rows === 0 ? " — chưa dùng được" : ""}
                  </td>
                  <td className="border-b border-hairline py-3 pr-3 font-mono">
                    {b._count.categories}
                  </td>
                  <td className="border-b border-hairline py-3 font-mono">{b._count.products}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
