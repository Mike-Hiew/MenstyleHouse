import { afterEach, describe, expect, it } from "vitest";
import { db } from "../src/lib/db";
import {
  createWarehouse,
  deleteWarehouse,
  KhoChinhError,
  KhoConTonError,
  KhoCoLichSuError,
  khoSchema,
  listWarehouses,
  setMainWarehouse,
  updateWarehouse,
} from "../src/server/admin/warehouses";

/**
 * Danh mục kho — M6.21.
 *
 * Hai bất biến đáng canh, và cả hai hỏng **im lặng**:
 *
 *   1. Đúng một kho mang `isMain`. Hai kho cùng cờ thì `khoChinh()` chọn kho nào
 *      là do thứ tự Postgres trả về; không kho nào mang cờ thì nó rơi xuống
 *      nhánh dự phòng "kho đầu theo tên". Cả hai trường hợp đều không báo lỗi,
 *      chỉ là hàng vào nhầm kho.
 *   2. Luôn còn ít nhất một kho. `moveStock` chỉ ghi `StockLevel` khi tìm được
 *      kho — hết kho thì nó lặng lẽ bỏ qua và tồn theo kho lệch với tồn tổng.
 */

const rac: string[] = [];

/** Trả lại đúng kho chính ban đầu để các file test khác không bị ảnh hưởng. */
let khoChinhBanDau: string | null = null;

afterEach(async () => {
  if (rac.length) {
    await db.stockLevel.deleteMany({ where: { warehouseId: { in: rac } } });
    await db.warehouse.deleteMany({ where: { id: { in: rac } } });
    rac.length = 0;
  }
  if (khoChinhBanDau) {
    await setMainWarehouse(khoChinhBanDau);
    khoChinhBanDau = null;
  }
});

async function khoMoi(ten = "Kho kiểm thử") {
  const k = await createWarehouse({ name: ten + " " + Date.now(), address: "123 Đường Thử, Q.1" });
  rac.push(k.id);
  return k.id;
}

describe("thêm và sửa kho", () => {
  it("thêm được kho và nó hiện trong danh sách", async () => {
    const id = await khoMoi("Kho Đà Nẵng");
    const ds = await listWarehouses();
    const k = ds.find((x) => x.id === id);
    expect(k).toBeDefined();
    expect(k!.name.startsWith("Kho Đà Nẵng")).toBe(true);
    // Kho mới chưa nhận hàng: mọi con số bằng 0, và đó là thứ hiện cạnh nút xoá.
    expect([k!.soSku, k!.tongTon, k!.soPhieu, k!.soDongSo]).toEqual([0, 0, 0, 0]);
  });

  it("sửa được tên và địa chỉ", async () => {
    const id = await khoMoi();
    await updateWarehouse(id, { name: "Kho đã đổi tên", address: "456 Đường Mới, Q.7" });

    const k = await db.warehouse.findUniqueOrThrow({ where: { id } });
    expect([k.name, k.address]).toEqual(["Kho đã đổi tên", "456 Đường Mới, Q.7"]);
  });

  it("tên quá ngắn hoặc thiếu địa chỉ thì chặn", () => {
    expect(khoSchema.safeParse({ name: "A", address: "123 Đường Thử" }).success).toBe(false);
    expect(khoSchema.safeParse({ name: "Kho ổn", address: "x" }).success).toBe(false);
  });
});

describe("kho chính", () => {
  it("LUÔN đúng một kho mang cờ, kể cả sau khi đổi qua đổi lại", async () => {
    const cu = await db.warehouse.findFirstOrThrow({ where: { isMain: true }, select: { id: true } });
    khoChinhBanDau = cu.id;

    const moi = await khoMoi();
    await setMainWarehouse(moi);

    const co = await db.warehouse.findMany({ where: { isMain: true }, select: { id: true } });
    expect(co).toHaveLength(1);
    expect(co[0].id).toBe(moi);
  });

  it("kho đầu tiên tự thành kho chính", async () => {
    /*
     * Không kiểm bằng cách xoá sạch kho — DB đang có phiếu nhập và sổ kho thật.
     * Đọc thẳng nhánh quyết định: `createWarehouse` đặt `isMain` khi và chỉ khi
     * bảng đang rỗng, nên khi đã có kho thì kho mới KHÔNG được mang cờ.
     */
    const id = await khoMoi();
    const k = await db.warehouse.findUniqueOrThrow({ where: { id } });
    expect(await db.warehouse.count()).toBeGreaterThan(1);
    expect(k.isMain).toBe(false);
  });
});

describe("chặn xoá", () => {
  it("CHẶN xoá kho chính", async () => {
    const cu = await db.warehouse.findFirstOrThrow({ where: { isMain: true }, select: { id: true } });
    await expect(deleteWarehouse(cu.id)).rejects.toThrow(KhoChinhError);
    expect(await db.warehouse.findUnique({ where: { id: cu.id } })).not.toBeNull();
  });

  it("CHẶN xoá kho còn tồn", async () => {
    const id = await khoMoi();
    const v = await db.variant.findFirstOrThrow({ select: { id: true } });
    await db.stockLevel.create({ data: { warehouseId: id, variantId: v.id, qty: 7 } });

    await expect(deleteWarehouse(id)).rejects.toThrow(KhoConTonError);
    expect(await db.warehouse.findUnique({ where: { id } })).not.toBeNull();
  });

  it("CHẶN xoá kho đã có lịch sử sổ sách", async () => {
    // Lịch sử đứt quãng còn tệ hơn một kho thừa nằm đó: sổ kho là thứ đối chiếu
    // khi tồn lệch, mất một mắt xích là mất luôn đường lần.
    const id = await khoMoi();
    const v = await db.variant.findFirstOrThrow({ select: { id: true, stock: true } });
    await db.inventoryMovement.create({
      data: {
        variantId: v.id,
        warehouseId: id,
        type: "ADJUST",
        delta: 0,
        stockAfter: v.stock,
        note: "Dòng kiểm thử",
        actorName: "Test",
      },
    });

    await expect(deleteWarehouse(id)).rejects.toThrow(KhoCoLichSuError);
    await db.inventoryMovement.deleteMany({ where: { warehouseId: id } });
  });

  it("xoá được kho rỗng khi vẫn còn kho khác", async () => {
    const id = await khoMoi();
    // Dòng tồn bằng 0 là rác còn sót sau khi chuyển hàng đi hết, không phải lịch
    // sử — xoá theo kho chứ không chặn.
    const v = await db.variant.findFirstOrThrow({ select: { id: true } });
    await db.stockLevel.create({ data: { warehouseId: id, variantId: v.id, qty: 0 } });

    await deleteWarehouse(id);
    expect(await db.warehouse.findUnique({ where: { id } })).toBeNull();
    expect(await db.stockLevel.count({ where: { warehouseId: id } })).toBe(0);
    rac.length = 0;
  });
});

/*
 * KHÔNG CÓ TEST cho nhánh "kho cuối cùng".
 *
 * Nó cần một DB chỉ còn đúng một kho, mà DB kiểm thử có ba kho từ seed kèm phiếu
 * nhập và sổ kho thật — xoá đi để kiểm một nhánh `if` là hỏng dữ liệu của mọi
 * file test khác.
 *
 * Ghi ra đây thay vì viết một ca kiểu `expect(new KhoCuoiCungError().name)`: ca
 * đó không kiểm gì cả nhưng trông như đã phủ, và đó là thứ tệ hơn một chỗ trống
 * được khai báo rõ. Nhánh này kiểm bằng tay theo mục 3 của kế hoạch.
 */
