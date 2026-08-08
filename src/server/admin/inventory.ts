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

const SORTABLE: Record<string, keyof Prisma.VariantOrderByWithRelationInput> = {
  sku: "sku",
  stock: "stock",
};

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
      orderBy: { [SORTABLE[q.sap] ?? "stock"]: q.sap ? q.chieu : "asc" },
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
