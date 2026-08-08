import { afterAll, describe, expect, it } from "vitest";
import {
  CancelledOrderError,
  OrderNotFoundError,
  getInvoice,
  invoiceSymbol,
  issueInvoice,
  listInvoices,
} from "../src/server/admin/invoices";
import { parseTableQuery } from "../src/lib/table-params";
import { splitVat } from "../src/lib/money";
import { getSettings } from "../src/server/settings";
import { db } from "../src/lib/db";

/**
 * Nghiệm thu phần hoá đơn của M5.
 *
 * Hai bất biến đáng test nhất ở đây không phải giao diện:
 *   1. **Dãy số không thủng lỗ và không trùng**, kể cả khi hai người bấm cùng lúc.
 *   2. **`net + vat === gross` tuyệt đối** trên `Int` đồng, ở mọi số tiền.
 */

const issued: string[] = [];

/** Đơn mới toanh để mỗi test không đụng vào đơn của test khác. */
async function newOrder(over: Partial<{ total: number; status: "PENDING" | "CANCELLED" }> = {}) {
  const variant = await db.variant.findFirstOrThrow({
    select: { id: true, sku: true, product: { select: { name: true } }, color: true, size: true },
  });
  const total = over.total ?? 1_234_567;
  const order = await db.order.create({
    data: {
      code: "TEST-HD-" + Math.abs(Number(process.hrtime.bigint() % 100000000n)),
      status: over.status ?? "PENDING",
      paymentMethod: "COD",
      receiver: "Nguyễn Văn Kiểm",
      phone: "0900123456",
      province: "TP.HCM",
      district: "Phú Nhuận",
      ward: "Phường 8",
      street: "142 Nguyễn Văn Trỗi",
      subtotal: total,
      total,
      items: {
        create: {
          variantId: variant.id,
          sku: variant.sku,
          productName: variant.product.name,
          color: variant.color,
          size: variant.size,
          qty: 1,
          unitPrice: total,
          lineTotal: total,
        },
      },
    },
    select: { id: true, code: true },
  });
  issued.push(order.id);
  return order;
}

const staff = () => db.user.findFirstOrThrow({ where: { role: "ADMIN" }, select: { id: true } });

afterAll(async () => {
  await db.invoice.deleteMany({ where: { orderId: { in: issued } } });
  await db.order.deleteMany({ where: { id: { in: issued } } });
});

describe("ký hiệu hoá đơn", () => {
  it("mang hai chữ số cuối của năm phát hành", () => {
    expect(invoiceSymbol(new Date("2026-08-08"))).toBe("1C26TMS");
    expect(invoiceSymbol(new Date("2027-01-01"))).toBe("1C27TMS");
  });
});

describe("cấp số", () => {
  it("số tăng dần và đệm đủ 8 chữ số", async () => {
    const a = await issueInvoice((await newOrder()).code, (await staff()).id);
    const b = await issueInvoice((await newOrder()).code, (await staff()).id);

    expect(a.number).toMatch(/^\d{8}$/);
    expect(Number(b.number)).toBe(Number(a.number) + 1);
  });

  it("phát hành lần hai trả về đúng hoá đơn cũ, không cấp thêm số", async () => {
    const order = await newOrder();
    const actor = (await staff()).id;

    const lan1 = await issueInvoice(order.code, actor);
    const lan2 = await issueInvoice(order.code, actor);

    expect(lan2.id).toBe(lan1.id);
    expect(lan2.number).toBe(lan1.number);
    expect(await db.invoice.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("bấm đồng thời cho bốn đơn thì ra bốn số khác nhau, liên tiếp", async () => {
    // Đây là ca mà `SELECT max + 1` không khoá sẽ hỏng: cùng đọc ra số cũ.
    const actor = (await staff()).id;
    const orders = await Promise.all([newOrder(), newOrder(), newOrder(), newOrder()]);

    const hd = await Promise.all(orders.map((o) => issueInvoice(o.code, actor)));
    const so = hd.map((h) => Number(h.number)).sort((a, b) => a - b);

    expect(new Set(so).size).toBe(4);
    expect(so[3] - so[0]).toBe(3);
  });

  it("không phát hành cho đơn đã huỷ, và báo lỗi rõ với đơn không tồn tại", async () => {
    const huy = await newOrder({ status: "CANCELLED" });
    const actor = (await staff()).id;

    await expect(issueInvoice(huy.code, actor)).rejects.toBeInstanceOf(CancelledOrderError);
    await expect(issueInvoice("KHONG-CO-THAT", actor)).rejects.toBeInstanceOf(OrderNotFoundError);
    expect(await db.invoice.count({ where: { orderId: huy.id } })).toBe(0);
  });
});

describe("tách VAT trên Int đồng", () => {
  it("net + vat luôn đúng bằng tổng đơn", async () => {
    const actor = (await staff()).id;
    const caiDat = await getSettings();
    // Gồm cả số lẻ khó chia cho 1,08.
    for (const total of [1, 999, 100_000, 459_000, 1_234_567, 2_000_000_003]) {
      const hd = await issueInvoice((await newOrder({ total })).code, actor);
      expect(hd.netAmount + hd.vatAmount).toBe(total);
      expect(hd.grossAmount).toBe(total);
      expect(hd.vatRate).toBe(caiDat.vatRate);
    }
  });

  it("khớp đúng hàm splitVat dùng chung với phiếu nhập", async () => {
    const caiDat = await getSettings();
    const hd = await issueInvoice((await newOrder({ total: 459_000 })).code, (await staff()).id);
    const mong = splitVat(459_000, caiDat.vatRate);
    expect({ net: hd.netAmount, vat: hd.vatAmount }).toEqual({ net: mong.net, vat: mong.vat });
  });
});

describe("thông tin người mua", () => {
  it("không khai công ty thì xuất cho người nhận, địa chỉ ghép từ đơn", async () => {
    const hd = await issueInvoice((await newOrder()).code, (await staff()).id);
    expect(hd.buyerName).toBe("Nguyễn Văn Kiểm");
    expect(hd.buyerTax).toBeNull();
    expect(hd.buyerAddr).toBe("142 Nguyễn Văn Trỗi, Phường 8, Phú Nhuận, TP.HCM");
  });

  it("khai công ty thì lấy nguyên thông tin đã chốt lúc đặt đơn", async () => {
    const order = await newOrder();
    await db.order.update({
      where: { id: order.id },
      data: {
        vatRequested: true,
        vatBuyerName: "Công ty TNHH Kiểm Thử",
        vatTaxCode: "0316998221",
        vatAddress: "1 Lê Duẩn, Quận 1, TP.HCM",
        vatEmail: "ketoan@kiemthu.vn",
      },
    });

    const hd = await issueInvoice(order.code, (await staff()).id);
    expect(hd.buyerName).toBe("Công ty TNHH Kiểm Thử");
    expect(hd.buyerTax).toBe("0316998221");
    expect(hd.buyerAddr).toBe("1 Lê Duẩn, Quận 1, TP.HCM");
  });

  it("khai toàn dấu cách thì coi như không khai", async () => {
    const order = await newOrder();
    await db.order.update({
      where: { id: order.id },
      data: { vatRequested: true, vatBuyerName: "   ", vatTaxCode: "  ", vatAddress: " " },
    });

    const hd = await issueInvoice(order.code, (await staff()).id);
    expect(hd.buyerName).toBe("Nguyễn Văn Kiểm");
    expect(hd.buyerTax).toBeNull();
  });
});

describe("đọc lại để in", () => {
  it("lấy được hoá đơn kèm dòng hàng của đơn", async () => {
    const order = await newOrder();
    const hd = await issueInvoice(order.code, (await staff()).id);

    const doc = await getInvoice(hd.symbol, hd.number);
    expect(doc?.order.code).toBe(order.code);
    expect(doc?.order.items).toHaveLength(1);
    expect(doc?.issuedBy?.name).toBeTruthy();
  });

  it("số không tồn tại thì trả null chứ không ném", async () => {
    expect(await getInvoice("1C26TMS", "99999999")).toBeNull();
  });

  it("danh sách tìm được theo số hoá đơn và theo mã đơn", async () => {
    const order = await newOrder();
    const hd = await issueInvoice(order.code, (await staff()).id);

    const theoSo = await listInvoices(parseTableQuery({ q: hd.number }));
    expect(theoSo.rows.map((r) => r.id)).toContain(hd.id);

    const theoDon = await listInvoices(parseTableQuery({ q: order.code }));
    expect(theoDon.rows.map((r) => r.id)).toContain(hd.id);
  });
});
