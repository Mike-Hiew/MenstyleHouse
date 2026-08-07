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

  return tx.inventoryMovement.create({
    data: {
      variantId: variant.id,
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
