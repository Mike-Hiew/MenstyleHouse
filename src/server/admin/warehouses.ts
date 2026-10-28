import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Danh mục kho.
 *
 * Trước M6.21 kho chỉ sinh ra từ `prisma/seed.ts` — model có đủ, ba nơi dùng nó
 * (tồn theo kho, phiếu nhập, sổ chuyển kho), nhưng không có một lời gọi
 * `warehouse.create` nào trong mã. Cửa hàng mở thêm kho phải sửa thẳng DB.
 *
 * Hai bất biến phải giữ, và cả hai hỏng im lặng nếu buông:
 *
 * 1. **Đúng một kho mang `isMain`.** `moveStock` chọn kho qua `khoChinh()`:
 *    `isMain` trước, không có thì lấy kho đầu theo tên. Hai kho cùng cờ thì hàng
 *    vào kho nào phụ thuộc thứ tự Postgres trả về — không đoán được, và không có
 *    lỗi nào báo.
 * 2. **Luôn còn ít nhất một kho.** `moveStock` chỉ ghi `StockLevel` khi tìm được
 *    kho; không còn kho nào thì nó lặng lẽ bỏ qua và bất biến "tổng mọi kho bằng
 *    `Variant.stock`" vỡ — đúng cái `tests/inventory.test.ts` canh.
 */

export const khoSchema = z.object({
  name: z.string().trim().min(2, "Nhập tên kho").max(80),
  address: z.string().trim().min(5, "Nhập địa chỉ kho").max(200),
});

export type KhoInput = z.infer<typeof khoSchema>;

/* ── Lỗi nghiệp vụ ────────────────────────────────────────── */
/*
 * Ba quan hệ trỏ tới `Warehouse` đều không khai `onDelete`, nên Prisma mặc định
 * `Restrict` và DB đã chặn sẵn. Nhưng lỗi ràng buộc thô chỉ nói "foreign key
 * constraint failed" — mấy lớp dưới đây là để nói cho người dùng biết đang vướng
 * cái gì và phải làm gì trước.
 */

/*
 * Câu lỗi dùng thẳng tên kho, **không thêm tiền tố "Kho"**: tên kho gần như luôn
 * đã bắt đầu bằng chữ đó, và ghép thêm thì ra "Kho Kho Tân Bình".
 */

export class KhoConTonError extends Error {
  constructor(ten: string, soSku: number, tong: number) {
    super(
      `${ten} còn ${tong} sản phẩm ở ${soSku} SKU. ` +
        `Chuyển hàng đi hoặc điều chỉnh về 0 rồi mới xoá được.`,
    );
    this.name = "KhoConTonError";
  }
}

export class KhoCoLichSuError extends Error {
  constructor(ten: string, soPhieu: number, soDong: number) {
    super(
      `${ten} đã có ${soPhieu} phiếu nhập và ${soDong} dòng sổ kho. ` +
        `Xoá là làm đứt lịch sử, nên chỉ đổi tên hoặc để đó chứ không xoá.`,
    );
    this.name = "KhoCoLichSuError";
  }
}

export class KhoChinhError extends Error {
  constructor(ten: string) {
    super(`${ten} đang là kho chính. Chỉ định kho chính khác rồi mới xoá được kho này.`);
    this.name = "KhoChinhError";
  }
}

export class KhoCuoiCungError extends Error {
  constructor() {
    super(
      "Đây là kho cuối cùng. Không còn kho nào thì hàng nhập về không biết ghi vào đâu, " +
        "và tồn theo kho sẽ lệch với tồn tổng.",
    );
    this.name = "KhoCuoiCungError";
  }
}

/* ── Đọc ──────────────────────────────────────────────────── */

/**
 * Danh sách kho kèm thứ cần biết **trước khi bấm xoá**: đang giữ bao nhiêu hàng
 * và đã có bao nhiêu phiếu. Hiện con số ngay tại dòng thì người ta không phải
 * đoán, và cũng không phải bấm xoá để biết là không xoá được.
 */
export async function listWarehouses() {
  const [kho, ton] = await Promise.all([
    db.warehouse.findMany({
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
      include: { _count: { select: { receipts: true, movements: true } } },
    }),
    db.stockLevel.groupBy({
      by: ["warehouseId"],
      where: { qty: { not: 0 } },
      _sum: { qty: true },
      _count: true,
    }),
  ]);

  const theoKho = new Map(ton.map((t) => [t.warehouseId, t]));
  return kho.map((k) => {
    const t = theoKho.get(k.id);
    return {
      id: k.id,
      name: k.name,
      address: k.address,
      isMain: k.isMain,
      soSku: t?._count ?? 0,
      tongTon: t?._sum.qty ?? 0,
      soPhieu: k._count.receipts,
      soDongSo: k._count.movements,
    };
  });
}

/* ── Ghi ──────────────────────────────────────────────────── */

/**
 * Thêm kho. Kho **đầu tiên** tự thành kho chính.
 *
 * Không thì tạo kho xong mà quên đặt cờ là `khoChinh()` rơi vào nhánh dự phòng
 * "lấy kho đầu theo tên" — vẫn chạy, nhưng hàng vào kho nào là do bảng chữ cái
 * quyết định chứ không phải do người quản lý.
 */
export async function createWarehouse(input: KhoInput) {
  const daCo = await db.warehouse.count();
  return db.warehouse.create({
    data: { name: input.name, address: input.address, isMain: daCo === 0 },
    select: { id: true },
  });
}

export async function updateWarehouse(id: string, input: KhoInput) {
  return db.warehouse.update({
    where: { id },
    data: { name: input.name, address: input.address },
    select: { id: true },
  });
}

/**
 * Đặt kho chính. Gỡ cờ mọi kho khác **trong cùng transaction**.
 *
 * Hai lệnh rời nhau thì có một khoảnh khắc hai kho cùng mang cờ, hoặc tệ hơn là
 * không kho nào mang cờ nếu lệnh thứ hai hỏng — và `khoChinh()` không hề báo
 * lỗi, nó chỉ lặng lẽ chọn kho khác.
 */
export async function setMainWarehouse(id: string) {
  await db.$transaction([
    db.warehouse.updateMany({ where: { id: { not: id } }, data: { isMain: false } }),
    db.warehouse.update({ where: { id }, data: { isMain: true } }),
  ]);
}

export async function deleteWarehouse(id: string) {
  const kho = await db.warehouse.findUnique({
    where: { id },
    select: {
      name: true,
      isMain: true,
      _count: { select: { receipts: true, movements: true } },
    },
  });
  if (!kho) return;

  if (kho.isMain) throw new KhoChinhError(kho.name);
  if ((await db.warehouse.count()) <= 1) throw new KhoCuoiCungError();

  const ton = await db.stockLevel.aggregate({
    where: { warehouseId: id, qty: { not: 0 } },
    _sum: { qty: true },
    _count: true,
  });
  if (ton._count > 0) throw new KhoConTonError(kho.name, ton._count, ton._sum.qty ?? 0);

  if (kho._count.receipts > 0 || kho._count.movements > 0) {
    throw new KhoCoLichSuError(kho.name, kho._count.receipts, kho._count.movements);
  }

  /*
   * Còn `StockLevel` với `qty = 0` thì xoá theo — đó chỉ là dòng còn sót sau khi
   * hàng đã chuyển đi hết, không mang thông tin gì. Lịch sử thật nằm ở
   * `InventoryMovement`, và tới đây đã chắc là không có dòng nào.
   */
  await db.$transaction([
    db.stockLevel.deleteMany({ where: { warehouseId: id } }),
    db.warehouse.delete({ where: { id } }),
  ]);
}
