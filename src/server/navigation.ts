import "server-only";
import { db } from "@/lib/db";

export type NavCategory = { name: string; slug: string };

/** Danh mục cho thanh điều hướng header, footer và trang chủ. */
export async function getNavCategories(): Promise<NavCategory[]> {
  return db.category.findMany({ orderBy: { sort: "asc" }, select: { name: true, slug: true } });
}

export async function findCategoryBySlug(slug: string): Promise<NavCategory | null> {
  return db.category.findUnique({ where: { slug }, select: { name: true, slug: true } });
}
