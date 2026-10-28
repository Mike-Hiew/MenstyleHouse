import { describe, expect, it } from "vitest";
import {
  fitRangesFromChart,
  parseFitHint,
  recommendSize,
  type SizeRange,
} from "@/lib/size-finder";
import { DEFAULT_TOP_RANGES } from "@/content/size-finder";

const R = DEFAULT_TOP_RANGES;
const rec = (heightCm: number, weightKg: number, fit: "om" | "vua" | "rong" = "vua") =>
  recommendSize({ heightCm, weightKg, fit }, R)!;

describe("recommendSize", () => {
  it("đúng giữa khoảng của một size thì ra size đó, độ tin cậy cao", () => {
    expect(rec(163, 55)).toMatchObject({ size: "S", index: 0 });
    expect(rec(168, 61).size).toBe("M");
    expect(rec(173, 68).size).toBe("L");
    expect(rec(177, 75).size).toBe("XL");
    expect(rec(182, 85).size).toBe("XXL");
    expect(rec(173, 68).confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("kiểu mặc dịch size: ôm nhỏ hơn hoặc bằng, rộng lớn hơn hoặc bằng", () => {
    const vua = rec(171, 66).index;
    expect(rec(171, 66, "om").index).toBeLessThanOrEqual(vua);
    expect(rec(171, 66, "rong").index).toBeGreaterThanOrEqual(vua);
    // Ngay giữa size L: rộng phải lên XL.
    expect(rec(173, 68, "rong").size).toBe("XL");
  });

  it("không bao giờ ra ngoài thang, dù số đo vượt bảng", () => {
    expect(rec(150, 45, "om").size).toBe("S");
    expect(rec(192, 90, "rong").size).toBe("XXL");
  });

  it("vượt xa bảng thì hạ độ tin cậy", () => {
    expect(rec(150, 45).confidence).toBeLessThan(rec(163, 55).confidence);
    expect(rec(192, 95).confidence).toBeLessThan(0.78);
  });

  it("lưng chừng hai size thì độ tin cậy thấp hơn đúng giữa size", () => {
    expect(rec(168.5, 61).confidence).toBeGreaterThan(rec(170, 64.5).confidence);
  });

  it("cao gầy (chiều cao và cân nặng lệch nhau xa) bị hạ độ tin cậy", () => {
    expect(rec(188, 55).confidence).toBeLessThan(rec(163, 55).confidence);
  });

  it("cân nặng nặng ký hơn chiều cao", () => {
    // Cân nặng giữa XL, chiều cao giữa M → nghiêng về L–XL, không về M.
    expect(["L", "XL"]).toContain(rec(168, 75).size);
  });

  it("bảng chỉ có cân nặng (quần) vẫn gợi ý được", () => {
    const quan: SizeRange[] = [
      { size: "29", height: null, weight: [50, 56] },
      { size: "30", height: null, weight: [55, 62] },
      { size: "31", height: null, weight: [61, 68] },
      { size: "32", height: null, weight: [67, 74] },
    ];
    expect(recommendSize({ heightCm: 170, weightKg: 64, fit: "vua" }, quan)?.size).toBe("31");
  });

  it("không có dữ liệu thì trả null", () => {
    expect(recommendSize({ heightCm: 170, weightKg: 64, fit: "vua" }, [])).toBeNull();
  });

  it("đơn điệu: nặng hơn không bao giờ ra size nhỏ hơn", () => {
    let prev = 0;
    for (let w = 45; w <= 90; w++) {
      const i = rec(172, w).index;
      expect(i).toBeGreaterThanOrEqual(prev);
      prev = i;
    }
  });
});

describe("parseFitHint", () => {
  it("đọc đúng định dạng đang có trong bảng size mẫu", () => {
    expect(parseFitHint("1m60–1m66 · 52–58kg")).toEqual({ height: [160, 166], weight: [52, 58] });
    expect(parseFitHint("1m78–1m85 · 79–90kg")).toEqual({ height: [178, 185], weight: [79, 90] });
  });

  it("đọc cả cm, gạch nối thường, có khoảng trắng", () => {
    expect(parseFitHint("160-166cm, 52 - 58 kg")).toEqual({ height: [160, 166], weight: [52, 58] });
    expect(parseFitHint("1.70–1.76m / 64–72kg")).toEqual({ height: [170, 176], weight: [64, 72] });
  });

  it("chỉ có cân nặng thì chiều cao là null", () => {
    expect(parseFitHint("55–62kg")).toEqual({ height: null, weight: [55, 62] });
  });

  it("chữ không đọc được thì cả hai null", () => {
    expect(parseFitHint("form rộng")).toEqual({ height: null, weight: null });
    expect(parseFitHint("")).toEqual({ height: null, weight: null });
  });
});

describe("fitRangesFromChart", () => {
  const chart = {
    columns: ["Size", "Vòng ngực", "Gợi ý"],
    rows: [
      { size: "S", values: ["96", "1m60–1m66 · 52–58kg"] },
      { size: "M", values: ["100", "1m65–1m72 · 57–65kg"] },
      { size: "L", values: ["104", "không rõ"] },
    ],
  };

  it("lấy cột Gợi ý, bỏ dòng không đọc được", () => {
    expect(fitRangesFromChart(chart)).toEqual([
      { size: "S", height: [160, 166], weight: [52, 58] },
      { size: "M", height: [165, 172], weight: [57, 65] },
    ]);
  });

  it("không có cột Gợi ý hoặc dưới 2 dòng đọc được thì rỗng", () => {
    expect(fitRangesFromChart({ columns: ["Size", "Vòng ngực"], rows: chart.rows })).toEqual([]);
    expect(fitRangesFromChart({ ...chart, rows: chart.rows.slice(0, 1) })).toEqual([]);
  });
});
