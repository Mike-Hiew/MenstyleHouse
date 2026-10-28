import "server-only";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { TAG } from "@/lib/cache-tags";
import type { OSize, SizeChart } from "@/lib/size-chart";
import { fitRangesFromChart, type SizeRange } from "@/lib/size-finder";
import { DEFAULT_TOP_RANGES, HOME_SIZE_CHART_SLUG } from "@/content/size-finder";

/**
 * Bảng size đọc từ DB cho trang sản phẩm.
 *
 * **Sản phẩm đè danh mục.** Một mẫu oversize nằm trong danh mục áo phông cần
 * bảng riêng; bắt tách hẳn một danh mục chỉ vì số đo khác là làm hỏng cây danh
 * mục để giải quyết một chuyện của sản phẩm.
 *
 * Bọc cache theo nhãn `catalog` như các truy vấn catalog khác: bảng size đổi
 * vài tháng một lần nhưng đọc ở mọi lượt xem sản phẩm.
 */
const BANG_INCLUDE = {
  columns: { orderBy: { sort: "asc" as const } },
  rows: { orderBy: { sort: "asc" as const }, include: { cells: true } },
};

export const bangSizeCho = unstable_cache(
  async (input: {
    productSizeChartId: string | null;
    categorySizeChartId: string | null;
  }): Promise<SizeChart | null> => {
    const id = input.productSizeChartId ?? input.categorySizeChartId;
    if (!id) return null;

    const b = await db.sizeChart.findUnique({
      where: { id },
      include: BANG_INCLUDE,
    });
    if (!b) return null;

    return hienThi(b);
  },
  ["bang-size"],
  { tags: [TAG.catalog], revalidate: 3600 },
);

function hienThi(b: Prisma.SizeChartGetPayload<{ include: typeof BANG_INCLUDE }>): SizeChart {
  return {
    title: b.name,
    columns: b.columns.map((c) => ({
      label: c.label,
      key: c.key,
      of: c.of,
      unit: c.unit,
    })),
    /*
     * Dựng mảng ô theo đúng thứ tự cột, tra ô theo `columnId`.
     *
     * Bản trước lấy thẳng `row.values` — một mảng chuỗi xếp song song với
     * `chart.columns` mà không gì buộc hai bên cùng độ dài. Ở đây dòng nào
     * thiếu ô thì ô đó thành "trống", không kéo mọi con số phía sau trượt
     * sang cột bên cạnh.
     */
    rows: b.rows.map((r) => {
      const theoCot = new Map(r.cells.map((o) => [o.columnId, o]));
      return {
        size: r.size,
        o: b.columns.map((c): OSize => {
          const o = theoCot.get(c.id);
          if (!o) return { loai: "trong" };
          if (o.text !== null) return { loai: "chu", text: o.text };
          if (o.min === null) return { loai: "trong" };
          return { loai: "so", min: o.min, max: o.max ?? o.min };
        }),
      };
    }),
    fit: b.fit,
    howTo: b.howTo,
  };
}

/**
 * Khoảng chiều cao/cân nặng cho bộ gợi ý size ở trang chủ: đọc từ hai cột số đo
 * người mặc (Chiều cao, Cân nặng) của bảng size áo trong DB, để cửa hàng sửa số
 * ở `/admin/bang-size` là trang chủ đổi theo. Bảng chưa có hoặc không đọc được
 * thì dùng bảng mặc định.
 */
export const khoangGoiYTrangChu = unstable_cache(
  async (): Promise<SizeRange[]> => {
    const b = await db.sizeChart.findUnique({
      where: { slug: HOME_SIZE_CHART_SLUG },
      include: BANG_INCLUDE,
    });
    const ranges = b ? fitRangesFromChart(hienThi(b)) : [];
    return ranges.length > 0 ? ranges : DEFAULT_TOP_RANGES;
  },
  ["goi-y-size-trang-chu"],
  { tags: [TAG.catalog], revalidate: 3600 },
);
