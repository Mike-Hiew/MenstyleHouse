import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { TAG } from "@/lib/cache-tags";

export type NavCategory = { name: string; slug: string };

/**
 * Danh mục cho thanh điều hướng header, footer và trang chủ.
 *
 * Đọc ở **mọi trang** của cửa hàng nhưng đổi vài tháng một lần, nên bọc cache
 * theo nhãn. `revalidateTag(TAG.catalog)` ở màn quản trị dọn ngay khi ai đó
 * thêm hay đổi tên danh mục — không phải chờ hết hạn.
 */
export const getNavCategories = unstable_cache(
  async (): Promise<NavCategory[]> =>
    db.category.findMany({ orderBy: { sort: "asc" }, select: { name: true, slug: true } }),
  ["nav-categories"],
  { tags: [TAG.catalog], revalidate: 3600 },
);

export async function findCategoryBySlug(slug: string): Promise<NavCategory | null> {
  return db.category.findUnique({ where: { slug }, select: { name: true, slug: true } });
}
