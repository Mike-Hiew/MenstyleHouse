import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { TAG } from "@/lib/cache-tags";
import type { SizeChart } from "@/lib/size-chart";
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
export const bangSizeCho = unstable_cache(
  async (input: {
    productSizeChartId: string | null;
    categorySizeChartId: string | null;
  }): Promise<SizeChart | null> => {
    const id = input.productSizeChartId ?? input.categorySizeChartId;
    if (!id) return null;

    const b = await db.sizeChart.findUnique({
      where: { id },
      include: { rows: { orderBy: { sort: "asc" } } },
    });
    if (!b) return null;

    return hienThi(b);
  },
  ["bang-size"],
  { tags: [TAG.catalog], revalidate: 3600 },
);

function hienThi(b: {
  name: string;
  columns: string[];
  rows: { size: string; values: string[] }[];
  fit: string;
  howTo: string[];
}): SizeChart {
  return {
    title: b.name,
    // Cột "Size" luôn đứng đầu và không cho sửa — nó là khoá của mỗi dòng.
    columns: ["Size", ...b.columns],
    rows: b.rows.map((r) => ({ size: r.size, values: r.values })),
    fit: b.fit,
    howTo: b.howTo,
  };
}

/**
 * Khoảng chiều cao/cân nặng cho bộ gợi ý size ở trang chủ: đọc từ cột "Gợi ý"
 * của bảng size áo trong DB, để cửa hàng sửa số ở `/admin/bang-size` là trang
 * chủ đổi theo. Bảng chưa có hoặc không đọc được thì dùng bảng mặc định.
 */
export const khoangGoiYTrangChu = unstable_cache(
  async (): Promise<SizeRange[]> => {
    const b = await db.sizeChart.findUnique({
      where: { slug: HOME_SIZE_CHART_SLUG },
      include: { rows: { orderBy: { sort: "asc" } } },
    });
    const ranges = b ? fitRangesFromChart(hienThi(b)) : [];
    return ranges.length > 0 ? ranges : DEFAULT_TOP_RANGES;
  },
  ["goi-y-size-trang-chu"],
  { tags: [TAG.catalog], revalidate: 3600 },
);
