import { describe, expect, it } from "vitest";
import {
  PAGE_STEP,
  parseCatalogQuery,
  serializeCatalogQuery,
  type CatalogQuery,
  type RawSearchParams,
} from "../src/lib/catalog";
import { listProducts, loadFacets } from "../src/server/catalog";
import { db } from "../src/lib/db";

/**
 * Nghiệm thu M1: "duyệt được toàn bộ catalog từ dữ liệu thật, bộ lọc trả đúng
 * số đếm".
 *
 * Ngữ nghĩa số đếm là chuẩn thương mại điện tử, đúng như sheet lọc trong mockup
 * mobile: số cạnh một ô = số sản phẩm mang giá trị đó, tính theo các *nhóm lọc
 * khác* và bỏ qua lựa chọn trong chính nhóm của nó. Nhờ vậy ô chưa tick không
 * bao giờ hiện 0 chỉ vì ô bên cạnh đang được tick.
 *
 * Lưu ý: trong cùng một nhóm nhiều lựa chọn được OR với nhau, nên tổng sau khi
 * tick thêm một ô sẽ *lớn hơn* số hiển thị. Đó là đúng, không phải lỗi.
 */

const base = (over: Partial<CatalogQuery> = {}): CatalogQuery => ({
  ...parseCatalogQuery({}),
  ...over,
});

const DIMENSIONS = [
  ["danh-muc", "categories"],
  ["thuong-hieu", "brands"],
  ["mau", "colors"],
  ["size", "sizes"],
] as const;

/** Số cạnh ô X trong nhóm D phải bằng tổng khi đặt nhóm D = [X], giữ nhóm khác. */
async function mismatches(raw: RawSearchParams) {
  const query = parseCatalogQuery(raw);
  const facets = await loadFacets(query);
  const bad: string[] = [];

  for (const [param, key] of DIMENSIONS) {
    for (const option of facets[key]) {
      const { total } = await listProducts({ ...query, [param]: [option.value], xem: 600 });
      if (total !== option.count) {
        bad.push(`${param}=${option.value}: facet ${option.count} ≠ thực tế ${total}`);
      }
    }
  }

  const saleTotal = (await listProducts({ ...query, km: true })).total;
  if (saleTotal !== facets.sale) bad.push(`km: facet ${facets.sale} ≠ thực tế ${saleTotal}`);

  return bad;
}

describe("số đếm cạnh mỗi ô lọc", () => {
  const CASES: { name: string; raw: RawSearchParams }[] = [
    { name: "không lọc gì", raw: {} },
    { name: "lọc một màu", raw: { mau: "Đen" } },
    { name: "lọc một size", raw: { size: "L" } },
    { name: "lọc hai danh mục", raw: { "danh-muc": "ao-phong,quan-jeans" } },
    { name: "lọc khoảng giá", raw: { "gia-tu": "300000", "gia-den": "600000" } },
    { name: "chỉ hàng giảm giá", raw: { km: "1" } },
    { name: "nhiều màu và nhiều size", raw: { mau: "Đen,Navy", size: "L,XL" } },
    { name: "có từ khoá tìm kiếm", raw: { q: "hoodie" } },
  ];

  for (const c of CASES) {
    it(c.name, async () => {
      const bad = await mismatches(c.raw);
      expect(bad, bad.join(" | ")).toEqual([]);
    });
  }
});

describe("kết quả lọc khớp DB", () => {
  it("không lọc gì thì đếm đúng số sản phẩm ACTIVE", async () => {
    const active = await db.product.count({ where: { status: "ACTIVE" } });
    expect((await listProducts(base())).total).toBe(active);
  });

  it("khoảng giá không trả về sản phẩm nào ngoài khoảng", async () => {
    const from = 300_000;
    const to = 600_000;
    const { items } = await listProducts(base({ "gia-tu": from, "gia-den": to, xem: 600 }));
    const out = items.filter((p) => {
      const price = p.salePrice ?? p.basePrice;
      return price < from || price > to;
    });
    expect(out.map((p) => p.name)).toEqual([]);
  });

  /*
   * Thanh kéo "giá tối đa" (M6.11) dựng cận trên từ `facets.priceCeil`, nên hai
   * đầu phải khớp nhau: kéo hết thanh sang phải **không được** lọc mất sản phẩm
   * nào. Cận trên tính sai một chút là khách kéo hết cỡ mà món đắt nhất vẫn
   * biến mất, và không hiểu vì sao.
   */
  it("cận trên của thanh kéo đủ bao mọi sản phẩm đang xem", async () => {
    const facets = await loadFacets(base());
    const { items } = await listProducts(base({ xem: 600 }));
    const dat = items.map((p) => p.salePrice ?? p.basePrice);

    expect(facets.priceCeil).toBeGreaterThanOrEqual(Math.max(...dat));
    expect(facets.priceFloor).toBeLessThanOrEqual(Math.min(...dat));
  });

  it("lọc đúng bằng cận trên thì giữ nguyên toàn bộ sản phẩm", async () => {
    const facets = await loadFacets(base());
    const tatCa = await listProducts(base({ xem: 600 }));
    const loc = await listProducts(base({ "gia-den": facets.priceCeil, xem: 600 }));
    expect(loc.total).toBe(tatCa.total);
  });

  it("cận trên và cận dưới tròn tới bước 10.000 của thanh kéo", async () => {
    // `step=10000`: cận lẻ thì kéo hết tay vẫn không chạm được tới giá cao nhất.
    const facets = await loadFacets(base());
    expect(facets.priceCeil % 10_000).toBe(0);
    expect(facets.priceFloor % 10_000).toBe(0);
  });

  it("thêm lựa chọn trong cùng nhóm thì kết quả rộng ra", async () => {
    const one = (await listProducts(base({ mau: ["Đen"] }))).total;
    const two = (await listProducts(base({ mau: ["Đen", "Navy"] }))).total;
    expect(two).toBeGreaterThan(one);
  });

  it("thêm nhóm lọc khác thì kết quả hẹp lại", async () => {
    const wide = (await listProducts(base({ mau: ["Đen"] }))).total;
    const narrow = (await listProducts(base({ mau: ["Đen"], km: true }))).total;
    expect(narrow).toBeLessThanOrEqual(wide);
  });
});

describe("tải thêm", () => {
  it("mở đúng số sản phẩm đã yêu cầu và báo đúng phần còn lại", async () => {
    const first = await listProducts(base());
    expect(first.items.length).toBe(Math.min(PAGE_STEP, first.total));
    expect(first.remaining).toBe(first.total - first.items.length);

    const second = await listProducts(base({ xem: PAGE_STEP * 2 }));
    expect(second.items.length).toBe(Math.min(PAGE_STEP * 2, second.total));
    expect(second.total).toBe(first.total);
  });

  it("không lặp sản phẩm giữa các lô", async () => {
    const { items } = await listProducts(base({ xem: PAGE_STEP * 3 }));
    expect(new Set(items.map((p) => p.id)).size).toBe(items.length);
  });
});

describe("sắp xếp", () => {
  it("giá tăng dần đúng thứ tự giá thực tế", async () => {
    const { items } = await listProducts(base({ "sap-xep": "gia-tang", xem: 600 }));
    const prices = items.map((p) => p.salePrice ?? p.basePrice);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("giá giảm dần đúng thứ tự giá thực tế", async () => {
    const { items } = await listProducts(base({ "sap-xep": "gia-giam", xem: 600 }));
    const prices = items.map((p) => p.salePrice ?? p.basePrice);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it("đổi kiểu sắp xếp không đổi tổng số kết quả", async () => {
    const totals = await Promise.all(
      (["moi-nhat", "gia-tang", "gia-giam", "ban-chay"] as const).map((s) =>
        listProducts(base({ "sap-xep": s })).then((r) => r.total),
      ),
    );
    expect(new Set(totals).size).toBe(1);
  });
});

describe("phân tích tham số URL", () => {
  it("tham số rác rơi về mặc định thay vì ném lỗi", () => {
    const q = parseCatalogQuery({
      xem: "-5",
      "sap-xep": "khong-co-kieu-nay",
      size: ["", "  "],
      km: "yes",
      "gia-tu": "abc",
    });
    expect(q.xem).toBe(PAGE_STEP);
    expect(q["sap-xep"]).toBe("moi-nhat");
    expect(q.size).toEqual([]);
    expect(q.km).toBe(false);
    expect(q["gia-tu"]).toBe(0);
  });

  it("nhận cả dạng lặp lẫn dạng ngăn phẩy, bỏ trùng", () => {
    expect(parseCatalogQuery({ size: "L,XL,L" }).size).toEqual(["L", "XL"]);
    expect(parseCatalogQuery({ mau: ["Đen", "Navy"] }).mau).toEqual(["Đen", "Navy"]);
  });

  it("nhập khoảng giá ngược thì tự đảo lại", () => {
    const q = parseCatalogQuery({ "gia-tu": "900000", "gia-den": "200000" });
    expect(q["gia-tu"]).toBe(200_000);
    expect(q["gia-den"]).toBe(900_000);
  });

  it("đọc rồi ghi lại cho ra đúng chuỗi truy vấn ban đầu", () => {
    const round = serializeCatalogQuery(
      parseCatalogQuery({
        "danh-muc": "ao-phong",
        size: "L,XL",
        mau: "Đen",
        "gia-tu": "200000",
        "gia-den": "500000",
        km: "1",
        "sap-xep": "gia-tang",
      }),
    );
    expect(round.get("danh-muc")).toBe("ao-phong");
    expect(round.get("size")).toBe("L,XL");
    expect(round.get("mau")).toBe("Đen");
    expect(round.get("gia-tu")).toBe("200000");
    expect(round.get("gia-den")).toBe("500000");
    expect(round.get("km")).toBe("1");
    // Mặc định không được lọt vào URL.
    expect(round.get("xem")).toBeNull();
    expect(round.get("q")).toBeNull();
  });
});
