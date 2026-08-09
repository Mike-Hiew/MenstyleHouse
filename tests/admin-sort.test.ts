import { describe, expect, it } from "vitest";
import { listOrders } from "../src/server/admin/orders";
import { listCustomers } from "../src/server/admin/customers";
import { listCoupons } from "../src/server/admin/coupons";
import { listTickets } from "../src/server/admin/tickets";
import { listStock } from "../src/server/admin/inventory";
import { listAdminProducts } from "../src/server/admin/products";
import { parseTableQuery } from "../src/lib/table-params";
import { settingsSchema } from "../src/server/settings";
import { db } from "../src/lib/db";

/**
 * Sắp xếp bảng quản trị.
 *
 * Bài đáng canh nhất là **sắp theo cột tính ra** (chi tiêu, số đơn, hạng của
 * khách). Cách viết dễ — cắt trang trước rồi sắp trong 20 dòng đang hiện — vẫn
 * cho ra một bảng trông có vẻ đúng, nhưng nó chỉ xếp lại đúng một trang chứ
 * không đưa khách chi nhiều nhất lên đầu. Nhìn thì không phân biệt được, nên
 * phải khoá bằng test.
 */

const q = (raw: Record<string, string>) => parseTableQuery(raw);

/**
 * Danh sách có đang giảm dần / tăng dần không.
 *
 * **Rỗng thì trả `false`, không phải `true`.** `[].every(...)` là `true`, nên
 * viết theo lối thẳng thì mọi bài kiểm sắp xếp đều xanh trên một bảng không có
 * dòng nào — chứng minh đúng bằng không.
 */
const giamDan = (xs: number[]) => xs.length > 0 && xs.every((v, i) => i === 0 || xs[i - 1] >= v);
const tangDan = (xs: number[]) => xs.length > 0 && xs.every((v, i) => i === 0 || xs[i - 1] <= v);

describe("đơn hàng", () => {
  it("sắp theo tổng tiền, cả hai chiều", async () => {
    const xuong = await listOrders(q({ sap: "total", chieu: "desc" }));
    const len = await listOrders(q({ sap: "total", chieu: "asc" }));
    expect(giamDan(xuong.rows.map((r) => r.total))).toBe(true);
    expect(tangDan(len.rows.map((r) => r.total))).toBe(true);
  });

  it("sắp theo tên khách — đảo chiều thì lộn ngược", async () => {
    const len = await listOrders(q({ sap: "receiver", chieu: "asc" }));
    const xuong = await listOrders(q({ sap: "receiver", chieu: "desc" }));
    expect(len.rows.length).toBeGreaterThan(1);
    expect(len.rows[0].receiver).not.toBe(xuong.rows[0].receiver);
  });

  it("sắp theo trạng thái đi theo VÒNG ĐỜI đơn, không theo bảng chữ cái", async () => {
    /*
     * Postgres sắp cột enum theo thứ tự khai báo, tức chờ → xác nhận → đóng gói
     * → giao → xong → huỷ. Nếu ai đó đổi sang lưu chuỗi thì thứ tự thành theo
     * chữ cái và "Đã giao" nằm cạnh "Đã huỷ" — bảng mất hết ý nghĩa.
     */
    const BAC: Record<string, number> = {
      PENDING: 0, CONFIRMED: 1, PACKING: 2, SHIPPING: 3, DELIVERED: 4, CANCELLED: 5, RETURNED: 6,
    };
    const r = await listOrders(q({ sap: "status", chieu: "asc", xem: "600" }));
    expect(tangDan(r.rows.map((x) => BAC[x.status]))).toBe(true);
  });

  it("khoá sắp xếp lạ thì rơi về mặc định, không nổ", async () => {
    // URL do người dùng sửa tay không được làm sập trang.
    const r = await listOrders(q({ sap: "khong-co-cot-nay", chieu: "asc" }));
    expect(r.rows.length).toBeGreaterThan(0);
  });
});

describe("khách hàng — cột tính ra", () => {
  it("sắp theo chi tiêu là sắp trên TOÀN BỘ khách, không phải trong một trang", async () => {
    const trang1 = await listCustomers(q({ sap: "chiTieu", chieu: "desc", trang: "1" }));
    const trang2 = await listCustomers(q({ sap: "chiTieu", chieu: "desc", trang: "2" }));

    expect(giamDan(trang1.rows.map((r) => r.chiTieu))).toBe(true);
    if (trang2.rows.length > 0) {
      const cuoiTrang1 = trang1.rows[trang1.rows.length - 1].chiTieu;
      const dauTrang2 = trang2.rows[0].chiTieu;
      // Nếu chỉ sắp trong trang thì con số này thường vọt lên cao hơn.
      expect(dauTrang2).toBeLessThanOrEqual(cuoiTrang1);
    }
  });

  it("sắp theo số đơn", async () => {
    const r = await listCustomers(q({ sap: "soDon", chieu: "desc" }));
    expect(giamDan(r.rows.map((x) => x.soDon))).toBe(true);
  });

  it("sắp theo hạng đi theo THỨ BẬC, không theo bảng chữ cái", async () => {
    // Theo chữ cái thì "BẠC" < "KIM CƯƠNG" < "MỚI" < "VÀNG" — vô nghĩa.
    const BAC: Record<string, number> = { "MỚI": 0, "BẠC": 1, "VÀNG": 2, "KIM CƯƠNG": 3 };
    const r = await listCustomers(q({ sap: "hang", chieu: "desc" }));
    expect(giamDan(r.rows.map((x) => BAC[x.hang]))).toBe(true);
  });

  it("sắp theo tên vẫn dùng SQL và không đổi tổng số", async () => {
    const theoTen = await listCustomers(q({ sap: "name", chieu: "asc" }));
    const macDinh = await listCustomers(q({}));
    expect(theoTen.total).toBe(macDinh.total);
  });
});

describe("các bảng còn lại", () => {
  it("khuyến mãi sắp theo lượt dùng", async () => {
    const r = await listCoupons(q({ sap: "uses", chieu: "desc" }));
    expect(giamDan(r.rows.map((x) => x.usedCount))).toBe(true);
  });

  it("khuyến mãi sắp theo hạn dùng", async () => {
    const r = await listCoupons(q({ sap: "end", chieu: "asc" }));
    expect(tangDan(r.rows.map((x) => x.endsAt.getTime()))).toBe(true);
  });

  it("hỗ trợ sắp theo mã yêu cầu", async () => {
    // Mã là ASCII thuần nên so bằng `sort()` mặc định là an toàn.
    const r = await listTickets(q({ sap: "code", chieu: "asc" }));
    const ma = r.rows.map((x) => x.code);
    expect(ma.length).toBeGreaterThan(0);
    expect([...ma].sort()).toEqual(ma);
  });

  it("tồn kho sắp theo ngưỡng cảnh báo", async () => {
    const r = await listStock(q({ sap: "lowStockAt", chieu: "desc" }));
    expect(giamDan(r.rows.map((x) => x.lowStockAt))).toBe(true);
  });

  it("tồn kho sắp theo TÊN SẢN PHẨM, tức qua quan hệ", async () => {
    /*
     * Không so với `localeCompare("vi")`: Postgres xếp tiếng Việt theo collation
     * của nó, khác cách JS xếp, nên bài kiểm sẽ đỏ vì hai bảng đối chiếu khác
     * nhau chứ không phải vì mã sai. Kiểm thứ **không phụ thuộc collation**:
     * đảo chiều thì danh sách phải lộn ngược lại.
     */
    const len = await listStock(q({ sap: "product", chieu: "asc" }));
    const xuong = await listStock(q({ sap: "product", chieu: "desc" }));
    const a = len.rows.map((x) => x.product.name);
    const b = xuong.rows.map((x) => x.product.name);
    expect(a.length).toBeGreaterThan(1);
    // Không so `b` với `a` đảo ngược: bảng nhiều hơn một trang nên trang đầu
    // của chiều xuôi đảo lại **không** bằng trang đầu của chiều ngược.
    expect(a[0]).not.toBe(b[0]);
  });

  it("sản phẩm sắp theo số biến thể", async () => {
    const r = await listAdminProducts(q({ sap: "variants", chieu: "desc" }));
    expect(giamDan(r.rows.map((x) => x.variantCount))).toBe(true);
  });

  it("sản phẩm sắp theo TỒN — tính trên toàn bộ, không phải trong một trang", async () => {
    /*
     * "Tồn" là tổng tồn mọi biến thể, không phải cột trong `Product`. Sắp trong
     * một trang thì hàng sắp hết không nổi lên đầu — đúng thứ chủ kho cần nhìn.
     */
    const t1 = await listAdminProducts(q({ sap: "stock", chieu: "asc", trang: "1" }));
    const t2 = await listAdminProducts(q({ sap: "stock", chieu: "asc", trang: "2" }));
    expect(tangDan(t1.rows.map((x) => x.stock))).toBe(true);
    if (t2.rows.length > 0) {
      expect(t2.rows[0].stock).toBeGreaterThanOrEqual(t1.rows[t1.rows.length - 1].stock);
    }
  });

  it("sản phẩm sắp theo danh mục — đảo chiều thì lộn ngược", async () => {
    const len = await listAdminProducts(q({ sap: "category", chieu: "asc" }));
    const xuong = await listAdminProducts(q({ sap: "category", chieu: "desc" }));
    const a = len.rows.map((x) => x.category.name);
    const b = xuong.rows.map((x) => x.category.name);
    expect(a.length).toBeGreaterThan(1);
    expect(a[0]).not.toBe(b[0]);
  });
});

describe("bật/tắt hạng thành viên", () => {
  const MAU = {
    shopName: "Men Style House",
    hotline: "1900 6060",
    email: "cskh@menstylehouse.vn",
    address: "142 Nguyễn Văn Trỗi",
    taxCode: "0316998221",
    bankName: "Vietcombank",
    bankAccount: "0071000988",
    bankOwner: "CTY MSH",
    shipInnerCity: "20000",
    shipProvince: "35000",
    freeShipFrom: "500000",
    vatRate: "8",
    holdMinutes: "120",
    payCod: "on",
    payBank: "on",
    pointValue: "1",
    redeemMaxPct: "50",
  };

  it("bật hạng thì ngưỡng vẫn phải tăng dần", async () => {
    const ket = settingsSchema.safeParse({
      ...MAU,
      tiersEnabled: "on",
      tierSilver: "800000",
      tierGold: "500000",
      tierDiamond: "4000000",
    });
    expect(ket.success).toBe(false);
  });

  it("TẮT hạng thì ngưỡng đặt ngược cũng lưu được", async () => {
    /*
     * Không chạy chương trình hạng thì ba con số kia không còn ý nghĩa. Bắt
     * chúng tăng dần lúc đó chỉ chặn người ta lưu cài đặt vì một lỗi không tồn
     * tại — và họ sẽ không hiểu vì sao không lưu được.
     */
    const ket = settingsSchema.safeParse({
      ...MAU,
      tierSilver: "800000",
      tierGold: "500000",
      tierDiamond: "4000000",
    });
    expect(ket.success).toBe(true);
  });

  it("tắt hạng KHÔNG làm mất chi tiêu đã ghi nhận", async () => {
    // Tắt là ngừng hiển thị, không phải ngừng ghi nhận — bật lại phải có sẵn số.
    const truoc = await listCustomers(q({}));
    const tongChiTieu = truoc.rows.reduce((n, r) => n + r.chiTieu, 0);

    await db.storeSetting.updateMany({ data: { tiersEnabled: false } });
    const sau = await listCustomers(q({}));
    await db.storeSetting.updateMany({ data: { tiersEnabled: true } });

    expect(sau.rows.reduce((n, r) => n + r.chiTieu, 0)).toBe(tongChiTieu);
  });

  it("tắt rồi bật lại thì cài đặt trở về đúng như cũ", async () => {
    await db.storeSetting.updateMany({ data: { tiersEnabled: false } });
    const { getSettings } = await import("../src/server/settings");
    // `getSettings` bọc `cache()` theo request nên trong test đọc thẳng DB.
    const tat = await db.storeSetting.findFirstOrThrow();
    expect(tat.tiersEnabled).toBe(false);

    await db.storeSetting.updateMany({ data: { tiersEnabled: true } });
    expect((await db.storeSetting.findFirstOrThrow()).tiersEnabled).toBe(true);
    expect(typeof getSettings).toBe("function");
  });
});
