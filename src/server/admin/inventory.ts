import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { TABLE_PAGE_SIZE, type TableQuery } from "@/lib/table-params";

/**
 * Tồn kho theo SKU. Chỉ **đọc** — mọi thay đổi tồn đi qua phiếu nhập hoặc
 * phiếu điều chỉnh, và cuối cùng vẫn qua `lib/inventory.ts` (luật số 2).
 */

export const STOCK_TABS = [
  { key: "", label: "Tất cả" },
  { key: "duoi-nguong", label: "Dưới ngưỡng" },
  { key: "het", label: "Hết hàng" },
];

/**
 * Mỗi cột một mệnh đề `orderBy` trọn vẹn, không chỉ tên trường: "SẢN PHẨM" sắp
 * theo tên qua quan hệ, "MÀU · SIZE" sắp theo màu rồi tới size.
 */
const SORTABLE: Record<string, Prisma.VariantOrderByWithRelationInput[]> = {
  sku: [{ sku: "asc" }],
  stock: [{ stock: "asc" }],
  lowStockAt: [{ lowStockAt: "asc" }],
  product: [{ product: { name: "asc" } }, { color: "asc" }, { size: "asc" }],
  variant: [{ color: "asc" }, { size: "asc" }],
};

/**
 * Đổi chiều cho cả danh sách mệnh đề, kể cả mệnh đề lồng qua quan hệ
 * (`{ product: { name: "asc" } }`).
 */
function theoChieu(
  ds: Prisma.VariantOrderByWithRelationInput[],
  chieu: "asc" | "desc",
): Prisma.VariantOrderByWithRelationInput[] {
  const doi = (o: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(
      Object.entries(o).map(([k, v]) => [
        k,
        v !== null && typeof v === "object" ? doi(v as Record<string, unknown>) : chieu,
      ]),
    );
  return ds.map((o) => doi(o as Record<string, unknown>) as Prisma.VariantOrderByWithRelationInput);
}

function whereFor(q: TableQuery): Prisma.VariantWhereInput {
  const and: Prisma.VariantWhereInput[] = [];

  if (q.tab === "het") and.push({ stock: { lte: 0 } });
  // Prisma không so sánh hai cột với nhau, nên "dưới ngưỡng" phải lọc thô ở SQL.
  // Ở đây dùng ngưỡng mặc định 10 cho bộ lọc nhanh; con số thật vẫn hiện từng dòng.
  if (q.tab === "duoi-nguong") and.push({ stock: { gt: 0, lte: 10 } });

  if (q.q) {
    and.push({
      OR: [
        { sku: { contains: q.q, mode: "insensitive" } },
        { product: { name: { contains: q.q, mode: "insensitive" } } },
      ],
    });
  }

  return and.length ? { AND: and } : {};
}

export async function listStock(q: TableQuery) {
  const where = whereFor(q);

  const [total, rows, low, out, all] = await Promise.all([
    db.variant.count({ where }),
    db.variant.findMany({
      where,
      orderBy: theoChieu(SORTABLE[q.sap] ?? [{ stock: "asc" }], q.sap ? q.chieu : "asc"),
      skip: (q.trang - 1) * TABLE_PAGE_SIZE,
      take: TABLE_PAGE_SIZE,
      select: {
        id: true,
        sku: true,
        color: true,
        colorHex: true,
        size: true,
        stock: true,
        lowStockAt: true,
        product: { select: { name: true, slug: true } },
      },
    }),
    db.variant.count({ where: { stock: { gt: 0, lte: 10 } } }),
    db.variant.count({ where: { stock: { lte: 0 } } }),
    db.variant.count(),
  ]);

  return {
    rows,
    total,
    tabs: [
      { key: "", label: "Tất cả", count: all },
      { key: "duoi-nguong", label: "Dưới ngưỡng", count: low },
      { key: "het", label: "Hết hàng", count: out },
    ],
  };
}

export type StockRow = Awaited<ReturnType<typeof listStock>>["rows"][number];

/** Tìm biến thể theo SKU để thêm dòng vào phiếu. */
export async function findVariantBySku(sku: string) {
  return db.variant.findUnique({
    where: { sku: sku.trim().toUpperCase() },
    select: {
      id: true,
      sku: true,
      color: true,
      size: true,
      stock: true,
      product: { select: { name: true } },
    },
  });
}

/** Sổ kho của một SKU — dùng khi cần đối soát một dòng nghi ngờ. */
export async function listMovements(variantId: string, take = 50) {
  return db.inventoryMovement.findMany({
    where: { variantId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/** Tồn của một biến thể tách theo từng kho, kèm kho chưa có dòng nào. */
export async function tonTheoKho(variantId: string) {
  const [kho, muc] = await Promise.all([
    db.warehouse.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isMain: true } }),
    db.stockLevel.findMany({ where: { variantId }, select: { warehouseId: true, qty: true } }),
  ]);
  const theo = new Map(muc.map((m) => [m.warehouseId, m.qty]));
  return kho.map((k) => ({ ...k, qty: theo.get(k.id) ?? 0 }));
}

export async function danhSachKho() {
  return db.warehouse.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, isMain: true },
  });
}
