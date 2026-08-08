import { describe, expect, it } from "vitest";
import {
  buildSku,
  isHexColor,
  nextProductCode,
  slugify,
  uniqueSlug,
} from "../src/lib/slug";

/**
 * Slug đi vào URL công khai và SKU đi vào tem dán trên hàng — cả hai sai thì
 * sửa rất đắt, vì đơn hàng đã lưu snapshot mã cũ.
 */

describe("slugify", () => {
  it.each([
    ["Áo hoodie cổ tròn", "ao-hoodie-co-tron"],
    ["Quần jeans ống suông", "quan-jeans-ong-suong"],
    ["Áo phông cotton 250gsm MSH-101", "ao-phong-cotton-250gsm-msh-101"],
  ])("%s → %s", (vao, ra) => expect(slugify(vao)).toBe(ra));

  it("đổi đ và Đ thành d, không bỏ mất chữ", () => {
    // `đ` không phải `d` cộng dấu phụ nên NFD không tách được. Bỏ qua nó thì
    // "Đồ nam" ra "nam" — mất luôn chữ đầu.
    expect(slugify("Đồ nam")).toBe("do-nam");
    expect(slugify("Đầm")).toBe("dam");
    expect(slugify("đen")).toBe("den");
  });

  it("gộp ký tự lạ thành một gạch, không để gạch thừa ở hai đầu", () => {
    expect(slugify("  Áo --- khoác!!! ")).toBe("ao-khoac");
    expect(slugify("Áo/Quần & Phụ kiện")).toBe("ao-quan-phu-kien");
  });

  it("chuỗi không có ký tự dùng được thì ra rỗng", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });
});

describe("chống trùng slug", () => {
  it("chưa ai dùng thì giữ nguyên", () => {
    expect(uniqueSlug("Áo thun basic", [])).toBe("ao-thun-basic");
  });

  it("trùng thì thêm số, và nhảy tiếp khi số đó cũng bận", () => {
    expect(uniqueSlug("Áo thun basic", ["ao-thun-basic"])).toBe("ao-thun-basic-2");
    expect(uniqueSlug("Áo thun basic", ["ao-thun-basic", "ao-thun-basic-2"])).toBe(
      "ao-thun-basic-3",
    );
  });

  it("tên toàn ký tự lạ vẫn ra slug dùng được", () => {
    expect(uniqueSlug("???", [])).toBe("san-pham");
    expect(uniqueSlug("???", ["san-pham"])).toBe("san-pham-2");
  });
});

describe("mã sản phẩm", () => {
  it("lấy số lớn nhất rồi cộng một, không phải đếm số sản phẩm", () => {
    // Đếm số lượng thì xoá một sản phẩm là mã quay lại đụng mã cũ, và SKU đã
    // nằm trong đơn hàng cũ sẽ chỉ sang hàng khác.
    expect(nextProductCode(["MSH-101", "MSH-140", "MSH-136"])).toBe("MSH-141");
    expect(nextProductCode([])).toBe("MSH-101");
  });

  it("bỏ qua mã không đọc được số", () => {
    expect(nextProductCode(["MSH-abc", "MSH-105", ""])).toBe("MSH-106");
  });
});

describe("SKU", () => {
  it.each([
    ["MSH-136", "Be", "L", "MSH-136-BE-L"],
    ["MSH-136", "Navy", "XXL", "MSH-136-NAV-XXL"],
    ["MSH-136", "Xanh rêu", "M", "MSH-136-XAN-M"],
    ["MSH-120", "Đen", "S", "MSH-120-DEN-S"],
  ])("%s + %s + %s → %s", (ma, mau, size, ra) => expect(buildSku(ma, mau, size)).toBe(ra));

  it("giữ đúng hình dạng SKU mà seed đang sinh", () => {
    // Nhân viên kho đọc tem không phải đoán mã nào thuộc thời nào.
    expect(buildSku("MSH-101", "Đen", "S")).toBe("MSH-101-DEN-S");
  });

  it("size là số hay chữ đều được", () => {
    expect(buildSku("MSH-150", "Xám", "32")).toBe("MSH-150-XAM-32");
    expect(buildSku("MSH-150", "Xám", "Freesize")).toBe("MSH-150-XAM-FREESIZE");
  });
});

describe("mã màu", () => {
  it("chỉ nhận đúng dạng #rrggbb", () => {
    expect(isHexColor("#201e1d")).toBe(true);
    expect(isHexColor("#EC3013")).toBe(true);
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("")).toBe(false);
  });
});
