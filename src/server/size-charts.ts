import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { TAG } from "@/lib/cache-tags";
import type { SizeChart } from "@/lib/size-chart";

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

    return {
      title: b.name,
      // Cột "Size" luôn đứng đầu và không cho sửa — nó là khoá của mỗi dòng.
      columns: ["Size", ...b.columns],
      rows: b.rows.map((r) => ({ size: r.size, values: r.values })),
      fit: b.fit,
      howTo: b.howTo,
    };
  },
  ["bang-size"],
  { tags: [TAG.catalog], revalidate: 3600 },
);
