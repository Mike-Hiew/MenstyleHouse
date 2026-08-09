import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { slugify, uniqueSlug } from "@/lib/slug";

/**
 * Quản lý bảng size.
 *
 * Một bảng gồm: tên · ghi chú form · hướng dẫn đo · danh sách cột · các dòng
 * size. Cột **"Size" không nằm trong `columns`** — nó luôn là cột đầu và là
 * khoá của mỗi dòng, cho sửa thì bảng mất chỗ neo.
 */

export const bangSizeSchema = z.object({
  name: z.string().trim().min(2, "Đặt tên cho bảng size").max(80),
  fit: z.string().trim().max(300).default(""),
  /** Mỗi dòng một hướng dẫn; ô nhập là textarea nên tách theo xuống dòng. */
  howTo: z.string().max(2000).default(""),
  /** Tên cột, phân tách bằng dấu phẩy hoặc xuống dòng. */
  columns: z.string().trim().min(1, "Khai ít nhất một cột"),
});

export type BangSizeInput = z.infer<typeof bangSizeSchema>;

/** Tách chuỗi nhiều dòng / phân tách bằng phẩy thành mảng, bỏ dòng trống. */
export function tach(v: string): string[] {
  return v
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export class ChartInUseError extends Error {
  constructor(soDanhMuc: number, soSanPham: number) {
    super(
      `Bảng này đang dùng cho ${soDanhMuc} danh mục và ${soSanPham} sản phẩm. ` +
        `Gỡ khỏi những chỗ đó rồi mới xoá được.`,
    );
    this.name = "ChartInUseError";
  }
}

export async function listSizeCharts() {
  return db.sizeChart.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { rows: true, categories: true, products: true } },
    },
  });
}

export async function getSizeChart(id: string) {
  return db.sizeChart.findUnique({
    where: { id },
    include: {
      rows: { orderBy: { sort: "asc" } },
      categories: { select: { id: true, name: true } },
    },
  });
}

export async function createSizeChart(input: BangSizeInput) {
  const daCo = await db.sizeChart.findMany({ select: { slug: true } });
  const slug = uniqueSlug(slugify(input.name), daCo.map((x) => x.slug));

  return db.sizeChart.create({
    data: {
      name: input.name,
      slug,
      fit: input.fit,
      howTo: tach(input.howTo),
      columns: tach(input.columns),
    },
    select: { id: true },
  });
}

export async function updateSizeChart(id: string, input: BangSizeInput) {
  return db.sizeChart.update({
    where: { id },
    data: {
      name: input.name,
      fit: input.fit,
      howTo: tach(input.howTo),
      columns: tach(input.columns),
    },
    select: { id: true },
  });
}

/**
 * Xoá bảng — chỉ khi **không còn ai dùng**.
 *
 * Quan hệ khai `onDelete: SetNull` nên xoá bừa vẫn chạy, nhưng hậu quả là hàng
 * loạt trang sản phẩm lặng lẽ mất bảng size mà không ai biết. Chặn ở đây và nói
 * rõ đang vướng bao nhiêu chỗ.
 */
export async function deleteSizeChart(id: string) {
  const b = await db.sizeChart.findUnique({
    where: { id },
    select: { _count: { select: { categories: true, products: true } } },
  });
  if (!b) return;
  if (b._count.categories > 0 || b._count.products > 0) {
    throw new ChartInUseError(b._count.categories, b._count.products);
  }
  await db.sizeChart.delete({ where: { id } });
}

/* ── Dòng size ────────────────────────────────────────────── */

export const dongSchema = z.object({
  chartId: z.string().min(1),
  size: z.string().trim().min(1, "Nhập nhãn size").max(20),
  /** Giá trị từng cột, phân tách bằng dấu phẩy. */
  values: z.string().max(500).default(""),
});

export async function addRow(input: z.infer<typeof dongSchema>) {
  const cuoi = await db.sizeChartRow.findFirst({
    where: { chartId: input.chartId },
    orderBy: { sort: "desc" },
    select: { sort: true },
  });

  return db.sizeChartRow.create({
    data: {
      chartId: input.chartId,
      size: input.size,
      values: tach(input.values),
      sort: (cuoi?.sort ?? -1) + 1,
    },
    select: { id: true },
  });
}

export async function updateRow(id: string, input: { size: string; values: string }) {
  return db.sizeChartRow.update({
    where: { id },
    data: { size: input.size.trim(), values: tach(input.values) },
    select: { id: true },
  });
}

export async function deleteRow(id: string) {
  await db.sizeChartRow.delete({ where: { id } });
}

/** Gán bảng cho danh mục; `null` là gỡ ra. */
export async function ganChoDanhMuc(categoryId: string, chartId: string | null) {
  await db.category.update({ where: { id: categoryId }, data: { sizeChartId: chartId } });
}

export async function danhSachDanhMucVaBang() {
  const [dm, bang] = await Promise.all([
    db.category.findMany({
      orderBy: { sort: "asc" },
      select: { id: true, name: true, slug: true, sizeChartId: true },
    }),
    db.sizeChart.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { danhMuc: dm, bang };
}
