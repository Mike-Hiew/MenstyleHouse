import { afterEach, describe, expect, it } from "vitest";
import { db } from "../src/lib/db";
import {
  addRow,
  bangSizeSchema,
  ChartInUseError,
  createSizeChart,
  deleteRow,
  deleteSizeChart,
  ganChoDanhMuc,
  getSizeChart,
  tach,
  updateRow,
  updateSizeChart,
} from "../src/server/admin/size-charts";

/**
 * Bảng size quản lý được — M6.18.
 *
 * Hai điều đáng canh nhất:
 *   - **dữ liệu cũ không được mất**: ba bảng viết cứng đã chuyển vào DB bằng
 *     migration; sai một chỗ là mọi trang sản phẩm lặng lẽ mất bảng size mà
 *     không có lỗi nào;
 *   - **xoá bảng đang dùng phải bị chặn**: quan hệ khai `SetNull` nên xoá bừa
 *     vẫn chạy, và hàng loạt danh mục mất bảng mà không ai biết.
 */

const rac: string[] = [];

afterEach(async () => {
  await db.category.updateMany({ where: { sizeChartId: { in: rac } }, data: { sizeChartId: null } });
  await db.sizeChart.deleteMany({ where: { id: { in: rac } } });
  rac.length = 0;
});

async function bangMoi(ten = "Bảng kiểm thử") {
  const b = await createSizeChart({
    name: ten + " " + Date.now(),
    fit: "Form vừa.",
    howTo: "Đo vòng ngực\nĐo rộng vai",
    columns: "Vòng ngực, Rộng vai, Gợi ý",
  });
  rac.push(b.id);
  return b.id;
}

describe("dữ liệu cũ đã chuyển vào DB", () => {
  it("ba bảng viết cứng ngày trước đều còn, đủ số dòng", async () => {
    const bang = await db.sizeChart.findMany({
      where: { slug: { in: ["ao", "quan-dai", "quan-short"] } },
      include: { _count: { select: { rows: true } } },
      orderBy: { slug: "asc" },
    });
    expect(bang.map((b) => b.slug)).toEqual(["ao", "quan-dai", "quan-short"]);
    // Đúng số dòng của bản viết cứng cũ: áo 5 size, quần dài 6, quần short 5.
    expect(bang.map((b) => b._count.rows)).toEqual([5, 6, 5]);
  });

  it("giữ nguyên ánh xạ danh mục cũ, và phụ kiện vẫn không có bảng", async () => {
    const dm = await db.category.findMany({
      where: { slug: { in: ["ao-phong", "quan-jeans", "quan-short", "phu-kien"] } },
      select: { slug: true, sizeChart: { select: { slug: true } } },
    });
    const theo = new Map(dm.map((d) => [d.slug, d.sizeChart?.slug ?? null]));
    expect(theo.get("ao-phong")).toBe("ao");
    expect(theo.get("quan-jeans")).toBe("quan-dai");
    expect(theo.get("quan-short")).toBe("quan-short");
    // Phụ kiện chỉ có Freesize — bày bảng đo làm gì.
    expect(theo.get("phu-kien")).toBeNull();
  });

  it("số đo giữ nguyên từng con một", async () => {
    const ao = await db.sizeChart.findUniqueOrThrow({
      where: { slug: "ao" },
      include: { rows: { orderBy: { sort: "asc" } } },
    });
    expect(ao.columns).toEqual(["Vòng ngực", "Rộng vai", "Dài áo", "Dài tay", "Gợi ý"]);
    expect(ao.rows.map((r) => r.size)).toEqual(["S", "M", "L", "XL", "XXL"]);
    expect(ao.rows[1].values.slice(0, 4)).toEqual(["100", "45", "70", "20"]);
  });
});

describe("tách chuỗi thành mảng", () => {
  it("nhận cả dấu phẩy lẫn xuống dòng, bỏ khoảng trắng thừa", () => {
    expect(tach(" Vòng ngực ,Rộng vai\n Dài áo ")).toEqual(["Vòng ngực", "Rộng vai", "Dài áo"]);
  });

  it("bỏ hẳn phần tử rỗng", () => {
    // Người ta hay để thừa dấu phẩy ở cuối; đó không phải một cột.
    expect(tach("A,,B,")).toEqual(["A", "B"]);
    expect(tach("")).toEqual([]);
  });
});

describe("quản lý bảng", () => {
  it("tạo bảng thì sinh slug từ tên", async () => {
    const id = await bangMoi("Bảng size áo khoác dày");
    const b = await db.sizeChart.findUniqueOrThrow({ where: { id } });
    expect(b.slug).toMatch(/^bang-size-ao-khoac-day/);
  });

  it("hai bảng trùng tên vẫn có slug khác nhau", async () => {
    const a = await createSizeChart({ name: "Trùng tên", fit: "", howTo: "", columns: "X" });
    const b = await createSizeChart({ name: "Trùng tên", fit: "", howTo: "", columns: "X" });
    rac.push(a.id, b.id);

    const [ba, bb] = await Promise.all([
      db.sizeChart.findUniqueOrThrow({ where: { id: a.id } }),
      db.sizeChart.findUniqueOrThrow({ where: { id: b.id } }),
    ]);
    expect(ba.slug).not.toBe(bb.slug);
  });

  it("sửa được tên, cột, ghi chú và hướng dẫn", async () => {
    const id = await bangMoi();
    await updateSizeChart(id, {
      name: "Tên mới",
      fit: "Form rộng.",
      howTo: "Bước một\nBước hai\nBước ba",
      columns: "Cột A, Cột B",
    });
    const b = await db.sizeChart.findUniqueOrThrow({ where: { id } });
    expect([b.name, b.fit]).toEqual(["Tên mới", "Form rộng."]);
    expect(b.columns).toEqual(["Cột A", "Cột B"]);
    expect(b.howTo).toHaveLength(3);
  });

  it("thêm dòng thì tự xếp thứ tự tăng dần", async () => {
    const chartId = await bangMoi();
    await addRow({ chartId, size: "S", values: "96, 43, nhỏ" });
    await addRow({ chartId, size: "M", values: "100, 45, vừa" });
    await addRow({ chartId, size: "L", values: "104, 47, to" });

    const b = await getSizeChart(chartId);
    expect(b!.rows.map((r) => r.size)).toEqual(["S", "M", "L"]);
    expect(b!.rows.map((r) => r.sort)).toEqual([0, 1, 2]);
    expect(b!.rows[1].values).toEqual(["100", "45", "vừa"]);
  });

  it("sửa và xoá được từng dòng", async () => {
    const chartId = await bangMoi();
    const r = await addRow({ chartId, size: "S", values: "1, 2, 3" });

    await updateRow(r.id, { size: "XS", values: "9, 8, 7" });
    let b = await getSizeChart(chartId);
    expect(b!.rows[0].size).toBe("XS");
    expect(b!.rows[0].values).toEqual(["9", "8", "7"]);

    await deleteRow(r.id);
    b = await getSizeChart(chartId);
    expect(b!.rows).toHaveLength(0);
  });

  it("gán và gỡ bảng cho danh mục", async () => {
    const chartId = await bangMoi();
    const dm = await db.category.findFirstOrThrow({ select: { id: true, sizeChartId: true } });
    const cu = dm.sizeChartId;

    await ganChoDanhMuc(dm.id, chartId);
    expect((await db.category.findUniqueOrThrow({ where: { id: dm.id } })).sizeChartId).toBe(chartId);

    await ganChoDanhMuc(dm.id, null);
    expect((await db.category.findUniqueOrThrow({ where: { id: dm.id } })).sizeChartId).toBeNull();

    await ganChoDanhMuc(dm.id, cu);
  });
});

describe("xoá bảng", () => {
  it("bảng chưa ai dùng thì xoá được, dòng đi theo", async () => {
    const chartId = await bangMoi();
    await addRow({ chartId, size: "M", values: "1, 2, 3" });

    await deleteSizeChart(chartId);
    expect(await db.sizeChart.findUnique({ where: { id: chartId } })).toBeNull();
    expect(await db.sizeChartRow.count({ where: { chartId } })).toBe(0);
  });

  it("CHẶN xoá khi còn danh mục đang dùng", async () => {
    /*
     * Quan hệ khai `onDelete: SetNull` nên xoá bừa vẫn chạy — và hậu quả là
     * hàng loạt trang sản phẩm lặng lẽ mất bảng size mà không có lỗi nào.
     */
    const chartId = await bangMoi();
    const dm = await db.category.findFirstOrThrow({ select: { id: true, sizeChartId: true } });
    const cu = dm.sizeChartId;
    await ganChoDanhMuc(dm.id, chartId);

    await expect(deleteSizeChart(chartId)).rejects.toThrow(ChartInUseError);
    expect(await db.sizeChart.findUnique({ where: { id: chartId } })).not.toBeNull();

    await ganChoDanhMuc(dm.id, cu);
  });

  it("CHẶN xoá khi còn sản phẩm gán riêng", async () => {
    const chartId = await bangMoi();
    const sp = await db.product.findFirstOrThrow({ select: { id: true, sizeChartId: true } });
    await db.product.update({ where: { id: sp.id }, data: { sizeChartId: chartId } });

    await expect(deleteSizeChart(chartId)).rejects.toThrow(ChartInUseError);

    await db.product.update({ where: { id: sp.id }, data: { sizeChartId: sp.sizeChartId } });
  });
});

describe("kiểm dữ liệu nhập", () => {
  it("tên quá ngắn thì chặn", () => {
    expect(bangSizeSchema.safeParse({ name: "A", columns: "X" }).success).toBe(false);
  });

  it("không khai cột nào thì chặn", () => {
    // Bảng không cột thì mỗi dòng chỉ còn nhãn size, chẳng nói được gì.
    expect(bangSizeSchema.safeParse({ name: "Bảng ổn", columns: "" }).success).toBe(false);
  });

  it("ghi chú và hướng dẫn được phép để trống", () => {
    const r = bangSizeSchema.safeParse({ name: "Bảng ổn", columns: "Vòng ngực" });
    expect(r.success).toBe(true);
    if (r.success) expect([r.data.fit, r.data.howTo]).toEqual(["", ""]);
  });
});
