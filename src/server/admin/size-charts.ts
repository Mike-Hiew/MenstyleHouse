import "server-only";
import { z } from "zod";
import { MeasureKey, MeasureOf, MeasureUnit, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { docO } from "@/lib/size-chart";
import { slugify, uniqueSlug } from "@/lib/slug";

/**
 * Quản lý bảng size.
 *
 * Một bảng gồm: tên · ghi chú form · hướng dẫn đo · danh sách cột · các dòng
 * size. Cột **"Size" không nằm trong danh sách cột** — nó luôn là cột đầu và là
 * khoá của mỗi dòng, cho sửa thì bảng mất chỗ neo.
 *
 * Từ M6.19 cột là bản ghi thật (`SizeChartColumn`) chứ không phải phần tử mảng,
 * và ô neo vào cột bằng khoá ngoại. Nhờ đó **sửa cột không còn làm lệch dòng** —
 * bản cũ ghi `columns` mới mà không đụng `values`, bỏ một cột ở giữa là mọi con
 * số trượt sang ô bên cạnh và bảng vẫn hiện ra như thường.
 */

export const bangSizeSchema = z.object({
  name: z.string().trim().min(2, "Đặt tên cho bảng size").max(80),
  fit: z.string().trim().max(300).default(""),
  /** Mỗi dòng một hướng dẫn; ô nhập là textarea nên tách theo xuống dòng. */
  howTo: z.string().max(2000).default(""),
});

export type BangSizeInput = z.infer<typeof bangSizeSchema>;

/** Lúc tạo mới thì khai luôn danh sách cột cho nhanh; sau đó sửa từng cột một. */
export const taoBangSchema = bangSizeSchema.extend({
  columns: z.string().trim().min(1, "Khai ít nhất một cột"),
});

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
      _count: { select: { rows: true, columns: true, categories: true, products: true } },
    },
  });
}

export async function getSizeChart(id: string) {
  return db.sizeChart.findUnique({
    where: { id },
    include: {
      columns: { orderBy: { sort: "asc" } },
      rows: { orderBy: { sort: "asc" }, include: { cells: true } },
      categories: { select: { id: true, name: true } },
    },
  });
}

export async function createSizeChart(input: z.infer<typeof taoBangSchema>) {
  const daCo = await db.sizeChart.findMany({ select: { slug: true } });
  const slug = uniqueSlug(
    slugify(input.name),
    daCo.map((x) => x.slug),
  );

  return db.sizeChart.create({
    data: {
      name: input.name,
      slug,
      fit: input.fit,
      howTo: tach(input.howTo),
      columns: {
        create: tach(input.columns).map((label, i) => ({ label, sort: i })),
      },
    },
    select: { id: true },
  });
}

export async function updateSizeChart(id: string, input: BangSizeInput) {
  return db.sizeChart.update({
    where: { id },
    data: { name: input.name, fit: input.fit, howTo: tach(input.howTo) },
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

/* ── Cột ──────────────────────────────────────────────────── */

export const cotSchema = z.object({
  chartId: z.string().min(1),
  label: z.string().trim().min(1, "Nhập tên cột").max(60),
  /** Ô trống nghĩa là cột chữ tự do — không đo được thành số. */
  key: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v === "" || v in MeasureKey, "Khoá đo không hợp lệ")
    .transform((v) => (v === "" ? null : (v as MeasureKey))),
  of: z.nativeEnum(MeasureOf).default(MeasureOf.GARMENT),
  unit: z.nativeEnum(MeasureUnit).default(MeasureUnit.CM),
});

export type CotInput = z.infer<typeof cotSchema>;

export async function addColumn(input: CotInput) {
  const cuoi = await db.sizeChartColumn.findFirst({
    where: { chartId: input.chartId },
    orderBy: { sort: "desc" },
    select: { sort: true },
  });

  return db.sizeChartColumn.create({
    data: {
      chartId: input.chartId,
      label: input.label,
      key: input.key,
      of: input.of,
      unit: input.unit,
      sort: (cuoi?.sort ?? -1) + 1,
    },
    select: { id: true },
  });
}

export async function updateColumn(id: string, input: Omit<CotInput, "chartId">) {
  return db.sizeChartColumn.update({
    where: { id },
    data: { label: input.label, key: input.key, of: input.of, unit: input.unit },
    select: { id: true },
  });
}

/** Xoá cột; ô của nó đi theo nhờ `onDelete: Cascade`, dòng khác không suy suyển. */
export async function deleteColumn(id: string) {
  await db.sizeChartColumn.delete({ where: { id } });
}

/**
 * Đổi chỗ một cột với cột liền kề.
 *
 * `@@unique([chartId, sort])` không cho hai cột cùng số thứ tự, kể cả trong
 * chốc lát giữa hai lệnh `UPDATE`. Nên phải đẩy một cột ra chỗ trống tạm rồi mới
 * hoán đổi — làm gọn trong một transaction để không bao giờ dừng lại ở giữa.
 */
export async function moveColumn(id: string, huong: "len" | "xuong") {
  const cot = await db.sizeChartColumn.findUnique({ where: { id } });
  if (!cot) return;

  const hangXom = await db.sizeChartColumn.findFirst({
    where:
      huong === "len"
        ? { chartId: cot.chartId, sort: { lt: cot.sort } }
        : { chartId: cot.chartId, sort: { gt: cot.sort } },
    orderBy: { sort: huong === "len" ? "desc" : "asc" },
  });
  if (!hangXom) return;

  const cho = -1 - cot.sort;
  await db.$transaction([
    db.sizeChartColumn.update({ where: { id: cot.id }, data: { sort: cho } }),
    db.sizeChartColumn.update({ where: { id: hangXom.id }, data: { sort: cot.sort } }),
    db.sizeChartColumn.update({ where: { id: cot.id }, data: { sort: hangXom.sort } }),
  ]);
}

/* ── Dòng size ────────────────────────────────────────────── */

export const dongSchema = z.object({
  chartId: z.string().min(1),
  size: z.string().trim().min(1, "Nhập nhãn size").max(20),
  /** Giá trị từng cột, phân tách bằng dấu phẩy, xếp đúng thứ tự cột. */
  values: z.string().max(500).default(""),
});

/**
 * Biến chuỗi gõ nhanh thành ô, ghép với cột theo thứ tự.
 *
 * Giữ lối nhập một dòng `96, 43, 68, 19` vì đó là cách nhập hàng loạt nhanh
 * nhất, nhưng thứ lưu xuống đã là dữ liệu có kiểu chứ không còn là chuỗi. Gõ
 * thiếu thì ô cuối để trống, gõ thừa thì bỏ phần dư — cột mới là thứ quyết định
 * bảng rộng bao nhiêu.
 */
function oCuaDong(
  cotIds: string[],
  values: string,
): Prisma.SizeChartCellUncheckedCreateWithoutRowInput[] {
  const parts = tach(values);
  return cotIds.map((columnId, i) => {
    const o = docO(parts[i] ?? "");
    return {
      columnId,
      min: o.loai === "so" ? o.min : null,
      max: o.loai === "so" ? o.max : null,
      text: o.loai === "chu" ? o.text : null,
    };
  });
}

async function cotCuaBang(chartId: string) {
  const cot = await db.sizeChartColumn.findMany({
    where: { chartId },
    orderBy: { sort: "asc" },
    select: { id: true },
  });
  return cot.map((c) => c.id);
}

export async function addRow(input: z.infer<typeof dongSchema>) {
  const [cuoi, cotIds] = await Promise.all([
    db.sizeChartRow.findFirst({
      where: { chartId: input.chartId },
      orderBy: { sort: "desc" },
      select: { sort: true },
    }),
    cotCuaBang(input.chartId),
  ]);

  return db.sizeChartRow.create({
    data: {
      chartId: input.chartId,
      size: input.size,
      sort: (cuoi?.sort ?? -1) + 1,
      cells: { create: oCuaDong(cotIds, input.values) },
    },
    select: { id: true },
  });
}

export async function updateRow(id: string, input: { size: string; values: string }) {
  const dong = await db.sizeChartRow.findUnique({ where: { id }, select: { chartId: true } });
  if (!dong) return;
  const cotIds = await cotCuaBang(dong.chartId);

  // Dựng lại toàn bộ ô của dòng: đơn giản hơn dò từng ô, và số ô luôn khớp số
  // cột hiện tại kể cả khi cột vừa được thêm hoặc bớt.
  await db.$transaction([
    db.sizeChartRow.update({ where: { id }, data: { size: input.size.trim() } }),
    db.sizeChartCell.deleteMany({ where: { rowId: id } }),
    db.sizeChartCell.createMany({
      data: oCuaDong(cotIds, input.values).map((o) => ({ ...o, rowId: id })),
    }),
  ]);
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
