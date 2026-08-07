import { describe, expect, it } from "vitest";
import {
  parseCatalogQuery,
  type CatalogQuery,
  type RawSearchParams,
  type Scope,
} from "../src/lib/catalog";
import { listProducts, loadFacets } from "../src/server/catalog";

/**
 * Nghiệm thu M1: "bộ lọc trả đúng số đếm".
 *
 * Ngữ nghĩa số đếm là chuẩn thương mại điện tử: số cạnh một ô = số sản phẩm
 * mang giá trị đó, tính theo các *nhóm lọc khác*, bỏ qua lựa chọn trong chính
 * nhóm của nó. Nhờ vậy ô chưa tick không bao giờ hiện 0 chỉ vì ô bên cạnh
 * đang được tick.
 *
 * Bất biến kiểm tra ở đây: số cạnh ô X trong nhóm D phải bằng đúng tổng sản
 * phẩm khi đặt nhóm D = [X] và giữ nguyên các nhóm khác.
 *
 * Lưu ý: trong cùng một nhóm, nhiều lựa chọn được OR với nhau, nên tổng sau
 * khi tick thêm một ô sẽ *lớn hơn* số hiển thị. Đó là đúng, không phải lỗi.
 */

const DIMENSIONS = [
  ["danh-muc", "categories"],
  ["thuong-hieu", "brands"],
  ["mau", "colors"],
  ["size", "sizes"],
  ["gia", "prices"],
] as const;

async function collectMismatches(raw: RawSearchParams, scope: Scope = {}) {
  const query = parseCatalogQuery(raw);
  const facets = await loadFacets(query, scope);
  const bad: string[] = [];

  for (const [param, facetKey] of DIMENSIONS) {
    if (scope.categorySlug && param === "danh-muc") continue;

    for (const option of facets[facetKey]) {
      // Đặt nhóm này về đúng một giá trị, giữ nguyên các nhóm khác.
      const next: CatalogQuery = { ...query, [param]: [option.value], trang: 1 };
      const { total } = await listProducts(next, scope);
      if (total !== option.count) {
        bad.push(`${param}=${option.value}: facet ${option.count} ≠ thực tế ${total}`);
      }
    }
  }

  const saleTotal = (await listProducts({ ...query, km: true, trang: 1 }, scope)).total;
  if (saleTotal !== facets.sale) {
    bad.push(`km=1: facet ${facets.sale} ≠ thực tế ${saleTotal}`);
  }

  return bad;
}

/** Trong cùng một nhóm, thêm lựa chọn phải nới rộng kết quả chứ không thu hẹp. */
async function unionGrows(raw: RawSearchParams, param: "mau" | "size", extra: string) {
  const query = parseCatalogQuery(raw);
  const before = (await listProducts(query)).total;
  const after = (await listProducts({ ...query, [param]: [...query[param], extra], trang: 1 })).total;
  return { before, after };
}

const CASES: { name: string; raw: RawSearchParams; scope?: Scope }[] = [
  { name: "không lọc gì", raw: {} },
  { name: "lọc một màu", raw: { mau: "Đen" } },
  { name: "lọc một size", raw: { size: "L" } },
  { name: "lọc hai danh mục", raw: { "danh-muc": "ao-phong,quan-jeans" } },
  { name: "lọc khoảng giá", raw: { gia: "300-500" } },
  { name: "chỉ hàng giảm giá", raw: { km: "1" } },
  { name: "nhiều màu và nhiều size", raw: { mau: "Đen,Navy", size: "L,XL" } },
  { name: "có từ khoá tìm kiếm", raw: { q: "hoodie" } },
  { name: "khoá theo danh mục", raw: {}, scope: { categorySlug: "ao-phong" } },
  {
    name: "khoá danh mục kèm lọc màu",
    raw: { mau: "Đen" },
    scope: { categorySlug: "quan-jeans" },
  },
];

describe("số đếm bộ lọc catalog", () => {
  for (const c of CASES) {
    it(c.name, async () => {
      const bad = await collectMismatches(c.raw, c.scope);
      expect(bad, bad.join(" | ")).toEqual([]);
    });
  }
});

describe("gộp lựa chọn trong cùng một nhóm", () => {
  it("thêm màu thứ hai thì kết quả rộng ra, không hẹp lại", async () => {
    const { before, after } = await unionGrows({ mau: "Đen" }, "mau", "Navy");
    expect(after).toBeGreaterThan(before);
  });

  it("thêm size thứ hai thì kết quả rộng ra", async () => {
    const { before, after } = await unionGrows({ size: "L" }, "size", "29");
    expect(after).toBeGreaterThan(before);
  });
});

describe("phân tích tham số URL", () => {
  it("tham số rác rơi về mặc định thay vì ném lỗi", () => {
    const q = parseCatalogQuery({
      trang: "-5",
      "sap-xep": "khong-co-kieu-nay",
      mau: ["", "  "],
      km: "yes",
    });
    expect(q.trang).toBe(1);
    expect(q["sap-xep"]).toBe("moi-nhat");
    expect(q.mau).toEqual([]);
    expect(q.km).toBe(false);
  });

  it("nhận cả dạng lặp lẫn dạng ngăn phẩy, bỏ trùng", () => {
    expect(parseCatalogQuery({ mau: "Đen,Navy,Đen" }).mau).toEqual(["Đen", "Navy"]);
    expect(parseCatalogQuery({ mau: ["Đen", "Navy"] }).mau).toEqual(["Đen", "Navy"]);
  });
});
