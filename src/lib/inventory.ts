import type { MovementType, Prisma } from "@prisma/client";
import { db } from "./db";

type Tx = Prisma.TransactionClient;

export class InsufficientStockError extends Error {
  constructor(public sku: string, public available: number, public wanted: number) {
    super("Không đủ tồn kho cho " + sku + ": còn " + available + ", cần " + wanted);
    this.name = "InsufficientStockError";
  }
}

/**
 * ĐIỂM VÀO DUY NHẤT để đổi Variant.stock trong toàn hệ thống.
 * Mọi thay đổi tồn kho đều đi qua đây và luôn sinh một InventoryMovement
 * trong cùng transaction, nên bất biến stock === Σ(movements.delta) luôn đúng.
 *
 * Không bao giờ viết `prisma.variant.update({ data: { stock } })` ở nơi khác.
 */
export async function moveStock(
  tx: Tx,
  input: {
    variantId: string;
    delta: number;
    type: MovementType;
    refType?: string;
    refId?: string;
    note?: string;
    actorName?: string;
    allowNegative?: boolean;
    /**
     * Kho chịu tác động. Bỏ trống thì vào **kho chính** — mọi lối gọi cũ (đặt
     * đơn, huỷ, trả hàng) không phải biết đến kho, và hệ thống vẫn chạy được
     * khi cửa hàng chỉ có một kho.
     */
    warehouseId?: string;
  },
) {
  const variant = await tx.variant.findUniqueOrThrow({
    where: { id: input.variantId },
    select: { id: true, sku: true, stock: true },
  });

  const stockAfter = variant.stock + input.delta;
  if (stockAfter < 0 && !input.allowNegative) {
    throw new InsufficientStockError(variant.sku, variant.stock, -input.delta);
  }

  await tx.variant.update({
    where: { id: variant.id },
    data: { stock: stockAfter },
  });

  /*
   * Ghi thêm tồn **theo kho**. `Variant.stock` vẫn là tổng của mọi kho, nên hai
   * con số phải nhúc nhích cùng nhau trong cùng transaction — lệch nhau là màn
   * tồn kho nói một đằng, màn theo kho nói một nẻo.
   */
  const khoId = input.warehouseId ?? (await khoChinh(tx));
  if (khoId) {
    await tx.stockLevel.upsert({
      where: { variantId_warehouseId: { variantId: variant.id, warehouseId: khoId } },
      create: { variantId: variant.id, warehouseId: khoId, qty: input.delta },
      update: { qty: { increment: input.delta } },
    });
  }

  return tx.inventoryMovement.create({
    data: {
      variantId: variant.id,
      warehouseId: khoId,
      type: input.type,
      delta: input.delta,
      stockAfter,
      refType: input.refType,
      refId: input.refId,
      note: input.note,
      actorName: input.actorName,
    },
  });
}

/** Kho mặc định khi nơi gọi không chỉ định; `null` khi chưa có kho nào. */
async function khoChinh(tx: Tx): Promise<string | null> {
  const w =
    (await tx.warehouse.findFirst({ where: { isMain: true }, select: { id: true } })) ??
    (await tx.warehouse.findFirst({ orderBy: { name: "asc" }, select: { id: true } }));
  return w?.id ?? null;
}

export class SameWarehouseError extends Error {
  constructor() {
    super("Kho đi và kho đến phải khác nhau.");
    this.name = "SameWarehouseError";
  }
}

/**
 * Chuyển hàng giữa hai kho.
 *
 * Sinh **hai dòng sổ** `TRANSFER` — một âm ở kho đi, một dương ở kho đến — nên
 * tổng `Variant.stock` không đổi và bất biến `stock === Σ(movements.delta)` vẫn
 * đúng. Ghi một dòng "chuyển kho" duy nhất thì sổ của từng kho không đọc được
 * là hàng đi đâu về đâu.
 */
export async function chuyenKho(
  tx: Tx,
  input: {
    variantId: string;
    tuKho: string;
    denKho: string;
    soLuong: number;
    actorName?: string;
  },
) {
  if (input.tuKho === input.denKho) throw new SameWarehouseError();
  if (input.soLuong <= 0) throw new Error("Số lượng chuyển phải lớn hơn 0.");

  const v = await tx.variant.findUniqueOrThrow({
    where: { id: input.variantId },
    select: { sku: true, stock: true },
  });

  const nguon = await tx.stockLevel.findUnique({
    where: { variantId_warehouseId: { variantId: input.variantId, warehouseId: input.tuKho } },
    select: { qty: true },
  });
  const con = nguon?.qty ?? 0;
  if (con < input.soLuong) throw new InsufficientStockError(v.sku, con, input.soLuong);

  const ten = input.actorName ?? "Thủ kho";
  const [tu, den] = await Promise.all([
    tx.warehouse.findUniqueOrThrow({ where: { id: input.tuKho }, select: { name: true } }),
    tx.warehouse.findUniqueOrThrow({ where: { id: input.denKho }, select: { name: true } }),
  ]);
  const ghi = `Chuyển ${input.soLuong} từ ${tu.name} sang ${den.name}`;

  await tx.stockLevel.update({
    where: { variantId_warehouseId: { variantId: input.variantId, warehouseId: input.tuKho } },
    data: { qty: { decrement: input.soLuong } },
  });
  await tx.stockLevel.upsert({
    where: { variantId_warehouseId: { variantId: input.variantId, warehouseId: input.denKho } },
    create: { variantId: input.variantId, warehouseId: input.denKho, qty: input.soLuong },
    update: { qty: { increment: input.soLuong } },
  });

  await tx.inventoryMovement.createMany({
    data: [
      {
        variantId: input.variantId,
        warehouseId: input.tuKho,
        type: "TRANSFER",
        delta: -input.soLuong,
        stockAfter: v.stock,
        note: ghi,
        actorName: ten,
      },
      {
        variantId: input.variantId,
        warehouseId: input.denKho,
        type: "TRANSFER",
        delta: input.soLuong,
        stockAfter: v.stock,
        note: ghi,
        actorName: ten,
      },
    ],
  });
}

/** Nhiều dòng cùng lúc — dùng khi ghi sổ phiếu nhập hoặc trừ tồn khi đặt đơn. */
export async function moveStockBatch(
  tx: Tx,
  lines: Parameters<typeof moveStock>[1][],
) {
  const out = [];
  for (const line of lines) out.push(await moveStock(tx, line));
  return out;
}

/** Kiểm tra bất biến — chạy trong test CI (M4) và khi cần đối soát. */
export async function auditStock() {
  const rows = await db.$queryRaw<
    { id: string; sku: string; stock: number; ledger: bigint | null }[]
  >`
    SELECT v.id, v.sku, v.stock, SUM(m.delta) AS ledger
    FROM "Variant" v
    LEFT JOIN "InventoryMovement" m ON m."variantId" = v.id
    GROUP BY v.id, v.sku, v.stock
  `;

  return rows
    .map((r) => ({ ...r, ledger: Number(r.ledger ?? 0) }))
    .filter((r) => r.stock !== r.ledger);
}

/**
 * Bất biến thứ hai: `Variant.stock` phải bằng **tổng tồn mọi kho**.
 *
 * Tách khỏi `auditStock` vì hỏng theo hai kiểu khác nhau: sổ lệch là ai đó ghi
 * thẳng vào `stock`, còn tổng kho lệch là một lối gọi `moveStock` nào đó không
 * cập nhật `StockLevel`.
 */
export async function auditWarehouse() {
  const rows = await db.$queryRaw<
    { id: string; sku: string; stock: number; theoKho: bigint | null }[]
  >`
    SELECT v.id, v.sku, v.stock, SUM(sl.qty) AS "theoKho"
    FROM "Variant" v
    LEFT JOIN "StockLevel" sl ON sl."variantId" = v.id
    GROUP BY v.id, v.sku, v.stock
  `;

  return rows
    .map((r) => ({ ...r, theoKho: Number(r.theoKho ?? 0) }))
    .filter((r) => r.stock !== r.theoKho);
}
