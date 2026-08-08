import { describe, expect, it } from "vitest";
import { db } from "../src/lib/db";
import { auditStock } from "../src/lib/inventory";
import {
  addLine,
  adjustStock,
  AdjustmentBelowZeroError,
  cancelReceipt,
  createDraft,
  EmptyReceiptError,
  getReceipt,
  postReceipt,
  ReceiptAlreadyPostedError,
  removeLine,
} from "../src/server/admin/receipts";

/**
 * Nghiệm thu M4: "ghi sổ một phiếu 4 dòng thì tồn kho ở màn sản phẩm đổi đúng,
 * và ghi sổ lần hai bị chặn."
 *
 * Ghi sổ là chỗ dễ làm hỏng sổ kho nhất — cộng nhầm, cộng hai lần, hoặc cộng
 * mà quên sinh `InventoryMovement`. Mọi test dưới đây đều kiểm lại bất biến
 * `stock === Σ(movements.delta)` sau khi xong.
 */

async function setup(lineCount = 4) {
  const [warehouse, supplier] = await Promise.all([
    db.warehouse.findFirstOrThrow(),
    db.supplier.findFirstOrThrow(),
  ]);
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });

  const variants = await db.variant.findMany({
    take: lineCount,
    orderBy: { sku: "asc" },
    select: { id: true, sku: true, stock: true },
  });

  const code = await createDraft({
    warehouseId: warehouse.id,
    supplierId: supplier.id,
    vatRate: 8,
    createdById: admin.id,
    actorName: "Thủ kho",
  });

  return { code, variants };
}

describe("phiếu nhập kho", () => {
  it("ghi sổ phiếu 4 dòng thì tồn từng SKU cộng đúng", async () => {
    const { code, variants } = await setup(4);
    const before = new Map(variants.map((v) => [v.id, v.stock]));

    const qtys = [3, 5, 7, 11];
    for (const [i, v] of variants.entries()) {
      await addLine(code, { variantId: v.id, sku: v.sku, qty: qtys[i], unitCost: 100_000 });
    }

    await postReceipt(code, "Thủ kho");

    for (const [i, v] of variants.entries()) {
      const after = await db.variant.findUniqueOrThrow({ where: { id: v.id } });
      expect(after.stock, v.sku).toBe((before.get(v.id) ?? 0) + qtys[i]);
    }

    const receipt = await getReceipt(code);
    expect(receipt?.status).toBe("POSTED");
    expect(receipt?.postedAt).not.toBeNull();
    expect(await auditStock()).toEqual([]);
  });

  it("ghi sổ lần hai bị chặn và không cộng tồn thêm lần nữa", async () => {
    const { code, variants } = await setup(1);
    const v = variants[0];
    await addLine(code, { variantId: v.id, sku: v.sku, qty: 6, unitCost: 50_000 });

    await postReceipt(code, "Thủ kho");
    const afterFirst = (await db.variant.findUniqueOrThrow({ where: { id: v.id } })).stock;

    await expect(postReceipt(code, "Thủ kho")).rejects.toBeInstanceOf(ReceiptAlreadyPostedError);

    const afterSecond = (await db.variant.findUniqueOrThrow({ where: { id: v.id } })).stock;
    expect(afterSecond).toBe(afterFirst);
    expect(await auditStock()).toEqual([]);
  });

  it("phiếu đã ghi sổ thì không sửa dòng được nữa", async () => {
    const { code, variants } = await setup(1);
    const v = variants[0];
    await addLine(code, { variantId: v.id, sku: v.sku, qty: 2, unitCost: 10_000 });
    await postReceipt(code, "Thủ kho");

    await expect(
      addLine(code, { variantId: v.id, sku: v.sku, qty: 1, unitCost: 10_000 }),
    ).rejects.toBeInstanceOf(ReceiptAlreadyPostedError);
    await expect(cancelReceipt(code, "Thủ kho")).rejects.toBeInstanceOf(ReceiptAlreadyPostedError);
  });

  it("phiếu rỗng không ghi sổ được", async () => {
    const { code } = await setup(1);
    await expect(postReceipt(code, "Thủ kho")).rejects.toBeInstanceOf(EmptyReceiptError);
  });

  it("tính VAT 8% đúng trên tiền Int đồng", async () => {
    const { code, variants } = await setup(2);
    await addLine(code, { variantId: variants[0].id, sku: variants[0].sku, qty: 2, unitCost: 150_000 });
    await addLine(code, { variantId: variants[1].id, sku: variants[1].sku, qty: 3, unitCost: 100_000 });

    const r = await getReceipt(code);
    // 2×150.000 + 3×100.000 = 600.000; VAT 8% = 48.000; tổng 648.000
    expect(r?.netAmount).toBe(600_000);
    expect(r?.vatAmount).toBe(48_000);
    expect(r?.grossAmount).toBe(648_000);
    expect(Number.isInteger(r?.vatAmount)).toBe(true);
  });

  it("thêm lại cùng SKU thì cộng dồn chứ không tạo dòng trùng", async () => {
    const { code, variants } = await setup(1);
    const v = variants[0];
    await addLine(code, { variantId: v.id, sku: v.sku, qty: 2, unitCost: 10_000 });
    await addLine(code, { variantId: v.id, sku: v.sku, qty: 3, unitCost: 10_000 });

    const r = await getReceipt(code);
    expect(r?.lines.length).toBe(1);
    expect(r?.lines[0].qty).toBe(5);
    expect(r?.lines[0].lineTotal).toBe(50_000);
  });

  it("xoá dòng thì tổng tiền tính lại đúng", async () => {
    const { code, variants } = await setup(2);
    await addLine(code, { variantId: variants[0].id, sku: variants[0].sku, qty: 1, unitCost: 100_000 });
    await addLine(code, { variantId: variants[1].id, sku: variants[1].sku, qty: 1, unitCost: 200_000 });

    const before = await getReceipt(code);
    expect(before?.netAmount).toBe(300_000);

    await removeLine(code, before!.lines[1].id);

    const after = await getReceipt(code);
    expect(after?.lines.length).toBe(1);
    expect(after?.netAmount).toBe(100_000);
  });
});

describe("phiếu điều chỉnh tồn", () => {
  it("điều chỉnh dương và âm đều giữ nguyên bất biến sổ", async () => {
    const v = await db.variant.findFirstOrThrow({ where: { stock: { gte: 10 } } });

    await adjustStock({ variantId: v.id, delta: 4, reason: "Kiểm kê thừa", actorName: "Thủ kho" });
    let after = await db.variant.findUniqueOrThrow({ where: { id: v.id } });
    expect(after.stock).toBe(v.stock + 4);

    await adjustStock({ variantId: v.id, delta: -6, reason: "Hàng lỗi", actorName: "Thủ kho" });
    after = await db.variant.findUniqueOrThrow({ where: { id: v.id } });
    expect(after.stock).toBe(v.stock - 2);

    expect(await auditStock()).toEqual([]);
  });

  it("không cho điều chỉnh xuống dưới 0", async () => {
    const v = await db.variant.findFirstOrThrow({ where: { stock: { gte: 1 } } });
    await expect(
      adjustStock({
        variantId: v.id,
        delta: -(v.stock + 1),
        reason: "Thử làm âm",
        actorName: "Thủ kho",
      }),
    ).rejects.toBeInstanceOf(AdjustmentBelowZeroError);
  });

  it("mỗi lần điều chỉnh đều để lại một dòng sổ có lý do", async () => {
    const v = await db.variant.findFirstOrThrow({ where: { stock: { gte: 5 } } });
    await adjustStock({ variantId: v.id, delta: 1, reason: "Ghi chú đối soát", actorName: "Thủ kho" });

    const last = await db.inventoryMovement.findFirst({
      where: { variantId: v.id, type: "ADJUST" },
      orderBy: { createdAt: "desc" },
    });
    expect(last?.note).toBe("Ghi chú đối soát");
    expect(last?.delta).toBe(1);
  });
});
