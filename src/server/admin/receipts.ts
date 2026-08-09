import "server-only";
import { Prisma, type ReceiptStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { moveStock } from "@/lib/inventory";
import { nextCode } from "@/lib/codes";
import { addVat } from "@/lib/money";
import { TABLE_PAGE_SIZE, type TableQuery } from "@/lib/table-params";

/**
 * Phiếu nhập kho. Hai luật xuyên suốt, không được phá:
 *
 * 1. **Ghi sổ là một chiều.** Phiếu `POSTED` không sửa, không ghi lại, không
 *    xoá. Sai thì lập phiếu điều chỉnh. Chặn ở **server**, không phải ẩn nút.
 * 2. Tồn chỉ đổi qua `moveStock` và luôn sinh `InventoryMovement` trong cùng
 *    transaction, nên `stock === Σ(movements.delta)` luôn đúng.
 */

export class ReceiptAlreadyPostedError extends Error {
  constructor(code: string) {
    super(
      `Phiếu ${code} đã ghi sổ rồi nên không đổi được nữa. ` +
        `Nếu sai số liệu, lập phiếu điều chỉnh tồn thay vì sửa phiếu cũ.`,
    );
    this.name = "ReceiptAlreadyPostedError";
  }
}

export class EmptyReceiptError extends Error {
  constructor() {
    super("Phiếu chưa có dòng hàng nào để ghi sổ.");
    this.name = "EmptyReceiptError";
  }
}

export const RECEIPT_STATUS_LABEL: Record<ReceiptStatus, string> = {
  DRAFT: "Nháp",
  POSTED: "Đã ghi sổ",
  CANCELLED: "Đã huỷ",
};

export const RECEIPT_TABS = [
  { key: "", label: "Tất cả", status: null },
  { key: "nhap", label: "Nháp", status: "DRAFT" as ReceiptStatus },
  { key: "da-ghi", label: "Đã ghi sổ", status: "POSTED" as ReceiptStatus },
  { key: "huy", label: "Đã huỷ", status: "CANCELLED" as ReceiptStatus },
];

const detailInclude = Prisma.validator<Prisma.GoodsReceiptInclude>()({
  lines: { orderBy: { id: "asc" } },
  warehouse: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  events: { orderBy: { createdAt: "asc" } },
});

export type ReceiptDetail = Prisma.GoodsReceiptGetPayload<{ include: typeof detailInclude }>;

/* ── Danh sách ────────────────────────────────────────────── */

const SORTABLE: Record<string, "code" | "status" | "createdAt" | "grossAmount"> = {
  code: "code",
  status: "status",
  createdAt: "createdAt",
  grossAmount: "grossAmount",
};

export async function listReceipts(q: TableQuery) {
  const tab = RECEIPT_TABS.find((t) => t.key === q.tab);
  const and: Prisma.GoodsReceiptWhereInput[] = [];
  if (tab?.status) and.push({ status: tab.status });
  if (q.q) {
    and.push({
      OR: [
        { code: { contains: q.q, mode: "insensitive" } },
        { refDoc: { contains: q.q, mode: "insensitive" } },
        { supplier: { name: { contains: q.q, mode: "insensitive" } } },
      ],
    });
  }
  const where = and.length ? { AND: and } : {};

  const [total, rows, counts] = await Promise.all([
    db.goodsReceipt.count({ where }),
    db.goodsReceipt.findMany({
      where,
      orderBy: SORTABLE[q.sap] ? { [SORTABLE[q.sap]]: q.chieu } : { createdAt: "desc" },
      skip: (q.trang - 1) * TABLE_PAGE_SIZE,
      take: TABLE_PAGE_SIZE,
      select: {
        id: true,
        code: true,
        status: true,
        refDoc: true,
        grossAmount: true,
        createdAt: true,
        postedAt: true,
        warehouse: { select: { name: true } },
        supplier: { select: { name: true } },
        _count: { select: { lines: true } },
      },
    }),
    db.goodsReceipt.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const byStatus = new Map(counts.map((c) => [c.status, c._count._all]));
  const all = counts.reduce((n, c) => n + c._count._all, 0);

  return {
    rows,
    total,
    tabs: RECEIPT_TABS.map((t) => ({
      key: t.key,
      label: t.label,
      count: t.status ? (byStatus.get(t.status) ?? 0) : all,
    })),
  };
}

export type ReceiptRow = Awaited<ReturnType<typeof listReceipts>>["rows"][number];

export async function getReceipt(code: string): Promise<ReceiptDetail | null> {
  return db.goodsReceipt.findUnique({ where: { code }, include: detailInclude });
}

export async function listWarehousesAndSuppliers() {
  const [warehouses, suppliers] = await Promise.all([
    db.warehouse.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { warehouses, suppliers };
}

/* ── Tạo và sửa phiếu nháp ────────────────────────────────── */

/** Phiếu mới luôn ở trạng thái nháp, chưa đụng gì tới tồn kho. */
export async function createDraft(input: {
  warehouseId: string;
  supplierId: string;
  refDoc?: string;
  vatRate: number;
  createdById: string;
  actorName: string;
}): Promise<string> {
  return db.$transaction(async (tx) => {
    const code = await nextCode(tx, "PNK", 4);
    const receipt = await tx.goodsReceipt.create({
      data: {
        code,
        warehouseId: input.warehouseId,
        supplierId: input.supplierId,
        refDoc: input.refDoc || null,
        vatRate: input.vatRate,
        status: "DRAFT",
        createdById: input.createdById,
      },
      select: { id: true, code: true },
    });
    await tx.goodsReceiptEvent.create({
      data: { receiptId: receipt.id, what: "Tạo phiếu nháp", who: input.actorName },
    });
    return receipt.code;
  });
}

/** Chỉ phiếu nháp mới sửa được — kiểm ở server, không tin UI. */
async function assertDraft(code: string) {
  const receipt = await db.goodsReceipt.findUnique({
    where: { code },
    select: { id: true, status: true, vatRate: true },
  });
  if (!receipt) throw new Error("Không tìm thấy phiếu " + code);
  if (receipt.status !== "DRAFT") throw new ReceiptAlreadyPostedError(code);
  return receipt;
}

/** Tính lại tổng tiền của phiếu. Tiền là `Int` đồng, VAT cộng thêm vào giá chưa thuế. */
async function recalc(tx: Prisma.TransactionClient, receiptId: string, vatRate: number) {
  const lines = await tx.goodsReceiptLine.findMany({
    where: { receiptId },
    select: { lineTotal: true },
  });
  const net = lines.reduce((n, l) => n + l.lineTotal, 0);
  const { vat, gross } = addVat(net, vatRate);
  await tx.goodsReceipt.update({
    where: { id: receiptId },
    data: { netAmount: net, vatAmount: vat, grossAmount: gross },
  });
}

export async function addLine(
  code: string,
  input: { variantId: string; sku: string; qty: number; unitCost: number },
) {
  const receipt = await assertDraft(code);

  await db.$transaction(async (tx) => {
    const existing = await tx.goodsReceiptLine.findFirst({
      where: { receiptId: receipt.id, variantId: input.variantId },
    });

    if (existing) {
      // Thêm lại cùng SKU thì cộng dồn, không tạo dòng trùng.
      const qty = existing.qty + input.qty;
      await tx.goodsReceiptLine.update({
        where: { id: existing.id },
        data: { qty, unitCost: input.unitCost, lineTotal: qty * input.unitCost },
      });
    } else {
      await tx.goodsReceiptLine.create({
        data: {
          receiptId: receipt.id,
          variantId: input.variantId,
          sku: input.sku,
          qty: input.qty,
          unitCost: input.unitCost,
          lineTotal: input.qty * input.unitCost,
        },
      });
    }

    await recalc(tx, receipt.id, receipt.vatRate);
  });
}

export async function removeLine(code: string, lineId: string) {
  const receipt = await assertDraft(code);
  await db.$transaction(async (tx) => {
    await tx.goodsReceiptLine.deleteMany({ where: { id: lineId, receiptId: receipt.id } });
    await recalc(tx, receipt.id, receipt.vatRate);
  });
}

/* ── Ghi sổ một chiều ─────────────────────────────────────── */

/**
 * Ghi sổ phiếu: cộng tồn cho từng dòng qua `moveStock`, chuyển sang `POSTED`.
 *
 * Chống ghi hai lần bằng cách cập nhật **có điều kiện** `status: "DRAFT"` ngay
 * trong transaction: hai request chạy song song thì chỉ một cái đổi được dòng,
 * cái còn lại thấy `count === 0` và bị chặn. Kiểm trước bằng `SELECT` không đủ
 * vì hai transaction có thể cùng đọc thấy `DRAFT`.
 */
export async function postReceipt(code: string, actorName: string): Promise<void> {
  const receipt = await db.goodsReceipt.findUnique({
    where: { code },
    include: { lines: true },
  });
  if (!receipt) throw new Error("Không tìm thấy phiếu " + code);
  if (receipt.status !== "DRAFT") throw new ReceiptAlreadyPostedError(code);
  if (receipt.lines.length === 0) throw new EmptyReceiptError();

  await db.$transaction(async (tx) => {
    const claimed = await tx.goodsReceipt.updateMany({
      where: { id: receipt.id, status: "DRAFT" },
      data: { status: "POSTED", postedAt: new Date() },
    });
    if (claimed.count === 0) throw new ReceiptAlreadyPostedError(code);

    for (const line of receipt.lines) {
      await moveStock(tx, {
        variantId: line.variantId,
        delta: line.qty,
        type: "RECEIPT",
        refType: "GoodsReceipt",
        refId: receipt.id,
        note: "Nhập kho " + receipt.code,
        actorName,
        // Phiếu đã ghi rõ nhập về kho nào — hàng phải vào đúng kho đó, không
        // rơi hết về kho chính như trước khi tách kho.
        warehouseId: receipt.warehouseId,
      });
    }

    await tx.goodsReceiptEvent.create({
      data: {
        receiptId: receipt.id,
        what: `Ghi sổ ${receipt.lines.length} dòng`,
        who: actorName,
      },
    });
  });
}

/** Huỷ phiếu nháp. Phiếu đã ghi sổ thì không huỷ được — phải lập phiếu điều chỉnh. */
export async function cancelReceipt(code: string, actorName: string): Promise<void> {
  const receipt = await assertDraft(code);
  await db.$transaction(async (tx) => {
    await tx.goodsReceipt.update({ where: { id: receipt.id }, data: { status: "CANCELLED" } });
    await tx.goodsReceiptEvent.create({
      data: { receiptId: receipt.id, what: "Huỷ phiếu nháp", who: actorName },
    });
  });
}

/* ── Phiếu điều chỉnh tồn ─────────────────────────────────── */

export class AdjustmentBelowZeroError extends Error {
  constructor(sku: string, stock: number, delta: number) {
    super(`Điều chỉnh ${delta} cho ${sku} sẽ làm tồn âm (đang còn ${stock}).`);
    this.name = "AdjustmentBelowZeroError";
  }
}

/**
 * Điều chỉnh tồn một SKU. Bắt buộc có lý do — sổ kho phải đọc được sau nhiều
 * tháng, "điều chỉnh 5" mà không nói vì sao là vô dụng khi đối soát.
 */
export async function adjustStock(input: {
  variantId: string;
  delta: number;
  reason: string;
  actorName: string;
}): Promise<void> {
  if (input.delta === 0) throw new Error("Số điều chỉnh phải khác 0.");

  const variant = await db.variant.findUniqueOrThrow({
    where: { id: input.variantId },
    select: { sku: true, stock: true },
  });
  if (variant.stock + input.delta < 0) {
    throw new AdjustmentBelowZeroError(variant.sku, variant.stock, input.delta);
  }

  await db.$transaction(async (tx) => {
    await moveStock(tx, {
      variantId: input.variantId,
      delta: input.delta,
      type: "ADJUST",
      refType: "Adjustment",
      note: input.reason,
      actorName: input.actorName,
    });
  });
}
