import { afterEach, describe, expect, it } from "vitest";
import { db } from "../src/lib/db";
import { dinhDangO, docO, oThanhChuoi, type OSize } from "../src/lib/size-chart";
import {
  addColumn,
  addRow,
  bangSizeSchema,
  ChartInUseError,
  createSizeChart,
  cotSchema,
  deleteColumn,
  deleteRow,
  deleteSizeChart,
  ganChoDanhMuc,
  getSizeChart,
  moveColumn,
  tach,
  taoBangSchema,
  updateColumn,
  updateRow,
  updateSizeChart,
} from "../src/server/admin/size-charts";

/**
 * Bảng size quản lý được — M6.18, số đo có kiểu từ M6.19.
 *
 * Ba điều đáng canh nhất:
 *   - **dữ liệu cũ không được mất**: ba bảng viết cứng đã chuyển vào DB bằng
 *     migration; sai một chỗ là mọi trang sản phẩm lặng lẽ mất bảng size mà
 *     không có lỗi nào;
 *   - **xoá bảng đang dùng phải bị chặn**: quan hệ khai `SetNull` nên xoá bừa
 *     vẫn chạy, và hàng loạt danh mục mất bảng mà không ai biết;
 *   - **sửa cột không được làm lệch dòng** — kiểu hỏng của bản mảng chuỗi.
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

/** Ô của một dòng, xếp đúng thứ tự cột, quy về chuỗi cho dễ so sánh. */
async function oCuaDong(chartId: string, size: string): Promise<string[]> {
  const b = await getSizeChart(chartId);
  const r = b!.rows.find((x) => x.size === size);
  if (!r) throw new Error("Không có dòng " + size);
  const theoCot = new Map(r.cells.map((o) => [o.columnId, o]));
  return b!.columns.map((c) => {
    const o = theoCot.get(c.id);
    if (!o) return "";
    const view: OSize =
      o.text !== null
        ? { loai: "chu", text: o.text }
        : o.min === null
          ? { loai: "trong" }
          : { loai: "so", min: o.min, max: o.max ?? o.min };
    return oThanhChuoi(view);
  });
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

  /**
   * Ánh xạ danh mục → bảng size do migration `20260809070000` đặt.
   *
   * Nó **đã từng bị seed xoá sạch**: seed `category.deleteMany()` rồi tạo lại mà
   * quên `sizeChartId`, nên chạy `db:seed` sau `migrate deploy` là mọi trang sản
   * phẩm mất nút "Bảng size" — không lỗi, không cảnh báo, chỉ là khách không còn
   * gì để tra. Ca này chạy trên DB đã seed nên nó canh đúng chỗ đó.
   */
  it("giữ nguyên ánh xạ danh mục cũ kể cả sau khi seed lại", async () => {
    const dm = await db.category.findMany({
      select: { slug: true, sizeChart: { select: { slug: true } } },
    });
    const theo = new Map(dm.map((d) => [d.slug, d.sizeChart?.slug ?? null]));

    expect(theo.get("ao-phong")).toBe("ao");
    expect(theo.get("ao-so-mi")).toBe("ao");
    expect(theo.get("ao-polo")).toBe("ao");
    expect(theo.get("ao-hoodie")).toBe("ao");
    expect(theo.get("ao-khoac")).toBe("ao");
    expect(theo.get("quan-jeans")).toBe("quan-dai");
    expect(theo.get("quan-short")).toBe("quan-short");
    // Phụ kiện chỉ có Freesize — bày bảng đo làm gì.
    expect(theo.get("phu-kien")).toBeNull();
  });

  it("số đo giữ nguyên từng con một", async () => {
    const ao = await db.sizeChart.findUniqueOrThrow({
      where: { slug: "ao" },
      include: { columns: { orderBy: { sort: "asc" } }, rows: { orderBy: { sort: "asc" } } },
    });
    expect(ao.columns.map((c) => c.label)).toEqual([
      "Vòng ngực",
      "Rộng vai",
      "Dài áo",
      "Dài tay",
      "Chiều cao",
      "Cân nặng",
    ]);
    expect(ao.rows.map((r) => r.size)).toEqual(["S", "M", "L", "XL", "XXL"]);
    expect(await oCuaDong(ao.id, "M")).toEqual(["100", "45", "70", "20", "165-172", "57-65"]);
  });

  /**
   * Cột "Gợi ý" cũ gộp chiều cao và cân nặng vào một chuỗi
   * `'1m65–1m72 · 57–65kg'` — đọc bằng mắt thì được, tính toán thì không. Tách
   * ra rồi thì đây là **số đo cơ thể duy nhất** trong bảng, và là chỗ mọi phép
   * gợi ý size sau này bám vào.
   */
  it("bảng áo có cả số đo sản phẩm lẫn số đo cơ thể, khai đúng đơn vị", async () => {
    const ao = await db.sizeChart.findUniqueOrThrow({
      where: { slug: "ao" },
      include: { columns: { orderBy: { sort: "asc" } } },
    });
    const theoKhoa = new Map(ao.columns.map((c) => [c.key, c]));

    expect(theoKhoa.get("CHEST")).toMatchObject({ of: "GARMENT", unit: "CM" });
    expect(theoKhoa.get("TOP_LENGTH")).toMatchObject({ of: "GARMENT", unit: "CM" });
    expect(theoKhoa.get("HEIGHT")).toMatchObject({ of: "BODY", unit: "CM" });
    expect(theoKhoa.get("WEIGHT")).toMatchObject({ of: "BODY", unit: "KG" });
    // Không cột nào còn để trống khoá: bảng này dùng được cho việc tính toán.
    expect(ao.columns.filter((c) => c.key === null)).toHaveLength(0);
  });

  it("hai bảng quần khai cân nặng bằng kg chứ không phải cm", async () => {
    const cot = await db.sizeChartColumn.findMany({
      where: { chart: { slug: { in: ["quan-dai", "quan-short"] } }, key: "WEIGHT" },
    });
    expect(cot).toHaveLength(2);
    expect(cot.every((c) => c.unit === "KG" && c.of === "BODY")).toBe(true);
  });
});

describe("đọc ô người dùng gõ", () => {
  const loai = (s: string) => docO(s).loai;

  it("một con số thành khoảng có min bằng max", () => {
    expect(docO("100")).toEqual({ loai: "so", min: 100, max: 100 });
    expect(docO("16.5")).toEqual({ loai: "so", min: 16.5, max: 16.5 });
  });

  it("nhận khoảng với cả gạch ngang thường lẫn gạch dài", () => {
    expect(docO("88-92")).toEqual({ loai: "so", min: 88, max: 92 });
    expect(docO("88 – 92")).toEqual({ loai: "so", min: 88, max: 92 });
  });

  it("dấu phẩy thập phân của tiếng Việt vẫn ra số", () => {
    expect(docO("16,5")).toEqual({ loai: "so", min: 16.5, max: 16.5 });
  });

  it("thứ không ra số thì giữ nguyên làm chữ, không vứt đi", () => {
    // Làm mất chữ người ta đã gõ tệ hơn nhiều so với một ô không tính được.
    expect(docO("hỏi nhân viên")).toEqual({ loai: "chu", text: "hỏi nhân viên" });
    expect(loai("")).toBe("trong");
    expect(loai("   ")).toBe("trong");
  });
});

describe("chữ hiện trong ô cho khách", () => {
  it("một giá trị hiện trần, khoảng hiện có gạch nối", () => {
    expect(dinhDangO(docO("100"))).toBe("100");
    expect(dinhDangO(docO("165-172"))).toBe("165–172");
  });

  it("ô trống hiện gạch ngang chứ không để rỗng", () => {
    // Ô rỗng trong bảng trông như lỗi tải; một gạch nói rõ "chỗ này không có số".
    expect(dinhDangO(docO(""))).toBe("—");
  });

  it("đi vòng qua ô nhập rồi quay lại thì không đổi", () => {
    for (const raw of ["100", "88-92", "16.5", "hỏi nhân viên"]) {
      expect(oThanhChuoi(docO(oThanhChuoi(docO(raw))))).toBe(oThanhChuoi(docO(raw)));
    }
  });
});

describe("tách chuỗi thành mảng", () => {
  it("nhận cả dấu phẩy lẫn xuống dòng, bỏ khoảng trắng thừa", () => {
    expect(tach(" a , b \n c ")).toEqual(["a", "b", "c"]);
  });

  it("bỏ hẳn phần tử rỗng", () => {
    expect(tach("a,,b,\n,c")).toEqual(["a", "b", "c"]);
  });
});

describe("quản lý bảng", () => {
  it("tạo bảng thì sinh slug từ tên", async () => {
    const id = await bangMoi("Bảng áo khoác");
    const b = await db.sizeChart.findUniqueOrThrow({ where: { id } });
    expect(b.slug.startsWith("bang-ao-khoac")).toBe(true);
  });

  it("hai bảng trùng tên vẫn có slug khác nhau", async () => {
    const ten = "Trùng tên " + Date.now();
    const a = await createSizeChart({ name: ten, fit: "", howTo: "", columns: "X" });
    const b = await createSizeChart({ name: ten, fit: "", howTo: "", columns: "X" });
    rac.push(a.id, b.id);

    const [ba, bb] = await Promise.all([
      db.sizeChart.findUniqueOrThrow({ where: { id: a.id } }),
      db.sizeChart.findUniqueOrThrow({ where: { id: b.id } }),
    ]);
    expect(ba.slug).not.toBe(bb.slug);
  });

  it("tạo bảng thì cột sinh theo đúng thứ tự đã khai", async () => {
    const id = await bangMoi();
    const b = await getSizeChart(id);
    expect(b!.columns.map((c) => c.label)).toEqual(["Vòng ngực", "Rộng vai", "Gợi ý"]);
    expect(b!.columns.map((c) => c.sort)).toEqual([0, 1, 2]);
    // Chưa khai khoá đo thì để trống, không đoán bừa theo tên cột.
    expect(b!.columns.every((c) => c.key === null)).toBe(true);
  });

  it("sửa được tên, ghi chú và hướng dẫn", async () => {
    const id = await bangMoi();
    await updateSizeChart(id, {
      name: "Tên mới",
      fit: "Form rộng.",
      howTo: "Bước một\nBước hai\nBước ba",
    });
    const b = await db.sizeChart.findUniqueOrThrow({ where: { id } });
    expect([b.name, b.fit]).toEqual(["Tên mới", "Form rộng."]);
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
    expect(await oCuaDong(chartId, "M")).toEqual(["100", "45", "vừa"]);
  });

  it("gõ thiếu giá trị thì ô cuối để trống chứ không dồn lên", async () => {
    const chartId = await bangMoi();
    await addRow({ chartId, size: "S", values: "96" });
    expect(await oCuaDong(chartId, "S")).toEqual(["96", "", ""]);
  });

  it("sửa và xoá được từng dòng", async () => {
    const chartId = await bangMoi();
    const r = await addRow({ chartId, size: "S", values: "1, 2, 3" });

    await updateRow(r.id, { size: "XS", values: "9, 8, 7" });
    let b = await getSizeChart(chartId);
    expect(b!.rows[0].size).toBe("XS");
    expect(await oCuaDong(chartId, "XS")).toEqual(["9", "8", "7"]);

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

describe("cột", () => {
  it("thêm cột thì xếp cuối, dòng đã có nhận ô trống", async () => {
    const chartId = await bangMoi();
    await addRow({ chartId, size: "M", values: "100, 45, vừa" });
    await addColumn({ chartId, label: "Dài áo", key: "TOP_LENGTH", of: "GARMENT", unit: "CM" });

    const b = await getSizeChart(chartId);
    expect(b!.columns.map((c) => c.label)).toEqual(["Vòng ngực", "Rộng vai", "Gợi ý", "Dài áo"]);
    // Dòng cũ chưa có số cho cột mới — hiện ô trống, không đẩy gì đi cả.
    expect(await oCuaDong(chartId, "M")).toEqual(["100", "45", "vừa", ""]);
  });

  it("sửa được nhãn, khoá đo, loại và đơn vị của cột", async () => {
    const chartId = await bangMoi();
    const b = await getSizeChart(chartId);
    const cot = b!.columns[0];

    await updateColumn(cot.id, {
      label: "Cân nặng",
      key: "WEIGHT",
      of: "BODY",
      unit: "KG",
    });

    const sau = await db.sizeChartColumn.findUniqueOrThrow({ where: { id: cot.id } });
    expect(sau).toMatchObject({ label: "Cân nặng", key: "WEIGHT", of: "BODY", unit: "KG" });
  });

  /**
   * Ca này chính là lỗi của bản cũ.
   *
   * Ngày trước cột là `String[]` và giá trị là `String[]` song song — bỏ cột
   * giữa bảng thì mọi con số phía sau trượt sang trái một ô, bảng vẫn hiện ra
   * bình thường và không ai biết cho tới khi khách mua nhầm size.
   */
  it("XOÁ CỘT GIỮA BẢNG KHÔNG LÀM LỆCH SỐ CỦA CÁC CỘT KHÁC", async () => {
    const chartId = await bangMoi();
    await addRow({ chartId, size: "M", values: "100, 45, vừa" });

    const truoc = await getSizeChart(chartId);
    await deleteColumn(truoc!.columns[1].id); // bỏ "Rộng vai" ở giữa

    const sau = await getSizeChart(chartId);
    expect(sau!.columns.map((c) => c.label)).toEqual(["Vòng ngực", "Gợi ý"]);
    // "vừa" vẫn thuộc cột "Gợi ý", không nhảy sang chỗ của "Rộng vai".
    expect(await oCuaDong(chartId, "M")).toEqual(["100", "vừa"]);
  });

  it("đổi thứ tự cột thì số đi theo cột, không đứng yên tại chỗ", async () => {
    const chartId = await bangMoi();
    await addRow({ chartId, size: "M", values: "100, 45, vừa" });

    const truoc = await getSizeChart(chartId);
    await moveColumn(truoc!.columns[2].id, "len"); // "Gợi ý" lên trước "Rộng vai"

    const sau = await getSizeChart(chartId);
    expect(sau!.columns.map((c) => c.label)).toEqual(["Vòng ngực", "Gợi ý", "Rộng vai"]);
    expect(await oCuaDong(chartId, "M")).toEqual(["100", "vừa", "45"]);
  });

  it("cột đầu không lên được nữa, cột cuối không xuống được nữa", async () => {
    const chartId = await bangMoi();
    const b = await getSizeChart(chartId);

    await moveColumn(b!.columns[0].id, "len");
    await moveColumn(b!.columns[2].id, "xuong");

    const sau = await getSizeChart(chartId);
    expect(sau!.columns.map((c) => c.label)).toEqual(["Vòng ngực", "Rộng vai", "Gợi ý"]);
  });

  it("sửa dòng sau khi thêm cột thì lấp đủ cột mới", async () => {
    const chartId = await bangMoi();
    const r = await addRow({ chartId, size: "M", values: "100, 45, vừa" });
    await addColumn({ chartId, label: "Dài áo", key: "TOP_LENGTH", of: "GARMENT", unit: "CM" });

    await updateRow(r.id, { size: "M", values: "100, 45, vừa, 70" });
    expect(await oCuaDong(chartId, "M")).toEqual(["100", "45", "vừa", "70"]);
  });
});

describe("xoá bảng", () => {
  it("bảng chưa ai dùng thì xoá được, dòng đi theo", async () => {
    const chartId = await bangMoi();
    await addRow({ chartId, size: "M", values: "1, 2, 3" });

    await deleteSizeChart(chartId);
    expect(await db.sizeChart.findUnique({ where: { id: chartId } })).toBeNull();
    expect(await db.sizeChartRow.count({ where: { chartId } })).toBe(0);
    expect(await db.sizeChartColumn.count({ where: { chartId } })).toBe(0);
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
    expect(taoBangSchema.safeParse({ name: "A", columns: "X" }).success).toBe(false);
  });

  it("không khai cột nào thì chặn lúc tạo", () => {
    // Bảng không cột thì mỗi dòng chỉ còn nhãn size, chẳng nói được gì.
    expect(taoBangSchema.safeParse({ name: "Bảng ổn", columns: "" }).success).toBe(false);
  });

  it("ghi chú và hướng dẫn được phép để trống", () => {
    const r = bangSizeSchema.safeParse({ name: "Bảng ổn" });
    expect(r.success).toBe(true);
    if (r.success) expect([r.data.fit, r.data.howTo]).toEqual(["", ""]);
  });

  it("cột để trống khoá đo thì thành cột chữ, không phải lỗi", () => {
    const r = cotSchema.safeParse({ chartId: "x", label: "Ghi chú", key: "", of: "GARMENT", unit: "CM" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.key).toBeNull();
  });

  it("khoá đo bịa ra thì chặn", () => {
    const r = cotSchema.safeParse({ chartId: "x", label: "X", key: "VONG_BUNG", of: "BODY", unit: "CM" });
    expect(r.success).toBe(false);
  });
});
